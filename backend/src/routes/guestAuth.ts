import { Router } from "express";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { randomUUID } from "crypto";
import { GuestUserModel } from "../models/GuestUser";
import { ClientModel } from "../models/Client";
import { cleanupExpiredGuests } from "../services/guestCleanupService";
import { GUEST_ID_PREFIX, GUEST_LIMITS, SYSTEM_USER_ID } from "../constants/guest";
import { AUTH_MESSAGES, GUEST_MESSAGES } from "../constants/messages";

const router = Router();

// IP-based cap on guest-account creation: prevents quota-bypass by minting
// fresh guests and DB bloat. Per-IP is correct here (there is no user yet).
const guestCreationLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: GUEST_LIMITS.creationsPerIpPerDay,
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
    name: source.name,
    phone: source.phone,
    email: source.email,
    notes: source.notes,
    documents: source.documents,
    createdAt: new Date(),
  });
}

// POST /api/auth/guest — public. Creates a 24h temporary guest account with
// cloned sample data and returns a matching 24h JWT.
router.post("/", guestCreationLimiter, async (req, res) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("[CONFIG ERROR] JWT_SECRET is not set.");
    return res.status(500).json({ error: AUTH_MESSAGES.serverConfigError });
  }

  // Opportunistic GC (no cron on Railway) — never blocks guest creation.
  try {
    await cleanupExpiredGuests();
  } catch (err) {
    console.error("[guest-auth] cleanup failed:", err);
  }

  try {
    const guestId = `${GUEST_ID_PREFIX}${randomUUID()}`;
    await GuestUserModel.create({
      id: guestId,
      expiresAt: new Date(Date.now() + GUEST_LIMITS.ttlMs),
    });
    await cloneSampleClient(guestId);

    const token = jwt.sign({ username: guestId, isGuest: true }, secret, {
      expiresIn: "24h",
    });
    return res.json({ token, username: guestId, isGuest: true });
  } catch (err) {
    console.error("[guest-auth] guest creation failed:", err);
    return res.status(500).json({ error: GUEST_MESSAGES.creationFailed });
  }
});

export default router;
