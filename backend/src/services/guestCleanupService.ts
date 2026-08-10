import { GuestUserModel } from "../models/GuestUser";
import { ClientModel } from "../models/Client";
import { UserSettingsModel } from "../models/UserSettings";
import { safeDeleteObject } from "./storageService";
import { GUEST_CLEANUP_BATCH } from "../constants/guest";

// Garbage-collects expired guest accounts: their clients, their own uploaded
// R2 files, and their settings docs. Shared sample files are skipped inside
// safeDeleteObject (samples/* guard), and the template client is never touched
// because it belongs to "system", not to any guest.
//
// Triggered at the start of every POST /api/auth/guest (no cron on Railway),
// where it runs detached from the response. It still deletes at most
// GUEST_CLEANUP_BATCH guests per call so one sweep can't fan out into hundreds
// of R2 round-trips; the next guest login picks up where this one stopped.
//
// Best-effort per guest: one failing guest never blocks the others.
export async function cleanupExpiredGuests(): Promise<void> {
  const expired = await GuestUserModel.find({ expiresAt: { $lt: new Date() } }).limit(
    GUEST_CLEANUP_BATCH
  );

  for (const guest of expired) {
    try {
      const clients = await ClientModel.find({ userId: guest.id });
      for (const client of clients) {
        for (const doc of client.documents) {
          if (doc.key) await safeDeleteObject(doc.key);
        }
      }
      await ClientModel.deleteMany({ userId: guest.id });
      await UserSettingsModel.deleteOne({ username: guest.id });
      await GuestUserModel.deleteOne({ id: guest.id });
      console.log(`[guest-cleanup] removed expired guest ${guest.id}`);
    } catch (err) {
      console.error(`[guest-cleanup] failed for guest ${guest.id}:`, err);
    }
  }
}
