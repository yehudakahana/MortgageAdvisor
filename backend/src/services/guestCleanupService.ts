import { GuestUserModel } from "../models/GuestUser";
import { ClientModel } from "../models/Client";
import { UserSettingsModel } from "../models/UserSettings";
import { deleteObject } from "./storageService";
import {
  GUEST_CLEANUP_BATCH,
  GUEST_ID_PREFIX,
  GUEST_SWEEP_INTERVAL_MS,
  SAMPLE_KEY_PREFIX,
} from "../constants/guest";

// Garbage-collects guest data: clients, their own uploaded R2 files, the
// settings doc (custom rules, both categories) and finally the guest record.
// Shared sample files (samples/*) are never deleted, and the template client
// belongs to "system", not to any guest.
//
// Triggered by a periodic sweep started in index.ts (so data is gone within
// about a minute of the 24h expiry, while the process is running, even when
// nobody logs in) and, as a backstop, at the
// start of POST /api/auth/guest. Each call deletes at most GUEST_CLEANUP_BATCH
// guests so one sweep can't fan out into hundreds of R2 round-trips.
//
// Order matters: the GuestUser record is removed LAST, and only when every R2
// delete succeeded. A failed delete leaves the record in place, so the next
// sweep retries instead of orphaning files forever.
let running = false;

async function purgeGuestData(guestId: string): Promise<void> {
  const clients = await ClientModel.find({ userId: guestId });
  for (const client of clients) {
    for (const doc of client.documents) {
      if (doc.key && !doc.key.startsWith(SAMPLE_KEY_PREFIX)) await deleteObject(doc.key);
    }
  }
  await ClientModel.deleteMany({ userId: guestId });
  await UserSettingsModel.deleteOne({ username: guestId });
}

export async function cleanupExpiredGuests(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const now = new Date();
    const expired = await GuestUserModel.find({ expiresAt: { $lt: now } }).limit(
      GUEST_CLEANUP_BATCH
    );

    for (const guest of expired) {
      try {
        await purgeGuestData(guest.id);
        await GuestUserModel.deleteOne({ id: guest.id });
        console.log("[guest-cleanup] removed an expired guest");
      } catch (err) {
        console.error("[guest-cleanup] failed for an expired guest, will retry:", err);
      }
    }

    // Orphans: rows written by a request that was in flight while its guest was
    // being purged (no GuestUser record left, so the loop above never sees them).
    const guestIds = (await ClientModel.distinct("userId", {
      userId: { $regex: `^${GUEST_ID_PREFIX}` },
    })) as string[];
    const settingsIds = (await UserSettingsModel.distinct("username", {
      username: { $regex: `^${GUEST_ID_PREFIX}` },
    })) as string[];
    const candidates = [...new Set([...guestIds, ...settingsIds])].slice(0, GUEST_CLEANUP_BATCH);
    for (const id of candidates) {
      if (await GuestUserModel.exists({ id })) continue;
      try {
        await purgeGuestData(id);
        console.log("[guest-cleanup] removed orphaned guest data");
      } catch (err) {
        console.error("[guest-cleanup] orphan purge failed, will retry:", err);
      }
    }
  } finally {
    running = false;
  }
}

// Starts the periodic sweep. unref() so it never keeps the process alive.
export function startGuestCleanupSchedule(intervalMs = GUEST_SWEEP_INTERVAL_MS): NodeJS.Timeout {
  const run = () =>
    void cleanupExpiredGuests().catch((err) => console.error("[guest-cleanup] sweep failed:", err));
  run();
  const timer = setInterval(run, intervalMs);
  timer.unref();
  return timer;
}
