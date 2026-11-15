import { Router } from "express";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { randomUUID } from "crypto";
import { GuestUserModel } from "../models/GuestUser";
import { ClientModel } from "../models/Client";
import { cleanupExpiredGuests } from "../services/guestCleanupService";
import { GUEST_ID_PREFIX, GUEST_LIMITS, SYSTEM_USER_ID } from "../constants/guest";
import { AUTH_MESSAGES, GUEST_MESSAGES } from "../constants/messages";
import { GuestUser } from "../types";
import { getJwtSecret, getJwtVersion } from "../config/auth";

const router = Router();

// Burst guard only. The real policy cap is activeGuestsPerIp below, which is
// enforced against MongoDB so it survives a redeploy.
const guestCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: GUEST_LIMITS.creationRequestsPerHour,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: GUEST_MESSAGES.tooManyGuestAccounts },
});

// Clone the system-owned demo template into the new guest account. Only the
// DB record is copied — document entries keep their shared samples/* R2 keys,
// so no binary is duplicated. Missing template = guest starts empty (never a
// real user's client).
async function cloneSampleClient(guestId: string): Promise<void> {
  const template = await ClientModel.findOne({ isTemplate: true, userId: SYSTEM_USER_ID });
  if (!template) {
    console.warn("[guest-auth] no template client found; guest starts without sample data");
    return;
  }
  const source = template.toObject();
  await ClientModel.create({
    id: randomUUID(),
    userId: guestId,
    isSample: true,
    name: source.name,
    phone: source.phone,
    email: source.email,
    notes: source.notes,
    documents: source.documents,
    createdAt: new Date(),
  });
}

// Signs a token that dies exactly when the guest record expires, so resuming
// an account never extends its 24h life. Carries the token version `v` like
// regular tokens so a JWT_VERSION bump revokes guests too.
function signGuestToken(guest: GuestUser, secret: string): string {
  const secondsLeft = Math.floor((guest.expiresAt.getTime() - Date.now()) / 1000);
  return jwt.sign({ username: guest.id, isGuest: true, v: getJwtVersion() }, secret, {
    expiresIn: secondsLeft,
  });
}

type DuplicateKeyError = { code: number; keyPattern?: Record<string, number> };
const isDuplicateKey = (err: unknown): err is DuplicateKeyError =>
  typeof err === "object" && err !== null && (err as DuplicateKeyError).code === 11000;

// Creates the guest account, or returns the live one for this device.
//
// The device and the per-IP cap are enforced by unique partial indexes on
// GuestUser (deviceId, and (ip, ipSlot)), so simultaneous sign-ins cannot both
// insert: the database rejects the second. An account is created by claiming
// the first free ipSlot; a duplicate on deviceId means another request just
// created this device's account, so we resume that one instead.
async function createGuestAccount(
  device: string | undefined,
  ip: string
): Promise<{ user: GuestUser; fresh: boolean } | "limit"> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const now = new Date();
    if (device) {
      const existing = await GuestUserModel.findOne({ deviceId: device, expiresAt: { $gt: now } });
      if (existing) return { user: existing, fresh: false };
      // An expired account keeps its record until the sweep purges it, but must
      // not hold the device or an IP slot.
      await GuestUserModel.updateMany({ deviceId: device, expiresAt: { $lte: now } }, { $unset: { deviceId: 1 } });
    }
    await GuestUserModel.updateMany(
      { ip, ipSlot: { $exists: true }, expiresAt: { $lte: now } },
      { $unset: { ipSlot: 1 } }
    );

    // Accounts that predate slots still count toward the cap.
    const live = await GuestUserModel.countDocuments({ ip, expiresAt: { $gt: now } });
    if (live >= GUEST_LIMITS.activeGuestsPerIp) return "limit";

    let deviceTaken = false;
    for (let slot = 0; slot < GUEST_LIMITS.activeGuestsPerIp; slot++) {
      try {
        const user = await GuestUserModel.create({
          id: `${GUEST_ID_PREFIX}${randomUUID()}`,
          deviceId: device,
          ip,
          ipSlot: slot,
          expiresAt: new Date(Date.now() + GUEST_LIMITS.ttlMs),
        });
        return { user, fresh: true };
      } catch (err) {
        if (!isDuplicateKey(err)) throw err;
        if (err.keyPattern && "deviceId" in err.keyPattern) {
          deviceTaken = true;
          break;
        }
        // Slot already claimed by a live account: try the next one.
      }
    }
    if (!deviceTaken) return "limit";
  }
  throw new Error("guest creation kept conflicting");
}

// POST /api/auth/guest — public. Returns a token for the caller's guest
// account, creating one only if they don't already have a live one.
//
// `deviceId` is a stable per-browser id kept in localStorage. Presenting it
// resumes the existing account: same data, same remaining TTL, and same usage
// counters — so signing out and re-entering cannot reset the message quota.
router.post("/", guestCreationLimiter, async (req, res) => {
  let secret: string;
  try {
    secret = getJwtSecret();
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    return res.status(500).json({ error: AUTH_MESSAGES.serverConfigError });
  }

  const { deviceId } = (req.body ?? {}) as Record<string, unknown>;
  // undefined (not null) so it matches the optional `deviceId` on GuestUser.
  const device = typeof deviceId === "string" && deviceId ? deviceId.slice(0, 100) : undefined;
  const ip = req.ip ?? "unknown";

  // Backstop GC (the main sweep runs on a timer in index.ts). Fire-and-forget and batched, so a
  // backlog of expired guests never delays the caller.
  void cleanupExpiredGuests().catch((err) =>
    console.error("[guest-auth] cleanup failed:", err)
  );

  try {
    if (device) {
      const existing = await GuestUserModel.findOne({
        deviceId: device,
        expiresAt: { $gt: new Date() },
      });
      if (existing) {
        console.log("[guest-auth] resumed a guest for a known device");
        return res.json({
          token: signGuestToken(existing, secret),
          username: existing.id,
          isGuest: true,
        });
      }
    }

    // No live account for this browser: a fresh one counts against the IP cap,
    // which is what stops someone clearing localStorage to mint new quotas.
    const activeForIp = await GuestUserModel.countDocuments({
      ip,
      expiresAt: { $gt: new Date() },
    });
    if (activeForIp >= GUEST_LIMITS.activeGuestsPerIp) {
      return res.status(429).json({ error: GUEST_MESSAGES.tooManyGuestAccounts });
    }

    const guest = await createGuestAccount(device, ip);
    if (guest === "limit") {
      return res.status(429).json({ error: GUEST_MESSAGES.tooManyGuestAccounts });
    }
    // Resumed (a concurrent request for the same device won): same account.
    if (!guest.fresh) {
      return res.json({
        token: signGuestToken(guest.user, secret),
        username: guest.user.id,
        isGuest: true,
      });
    }
    await cloneSampleClient(guest.user.id);

    return res.json({
      token: signGuestToken(guest.user, secret),
      username: guest.user.id,
      isGuest: true,
    });
  } catch (err) {
    console.error("[guest-auth] guest creation failed:", err);
    return res.status(500).json({ error: GUEST_MESSAGES.creationFailed });
  }
});

export default router;
