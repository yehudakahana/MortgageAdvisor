import mongoose from "mongoose";
import { GuestUserModel } from "../models/GuestUser";
import { ClientModel } from "../models/Client";
import { UserSettingsModel } from "../models/UserSettings";
import { EXTRA_TENANT_COLLECTIONS, purgeTenantData } from "./tenantDataService";
import {
  GUEST_CLEANUP_BATCH,
  GUEST_MAX_BATCHES_PER_SWEEP,
  GUEST_ID_PREFIX,
  GUEST_SWEEP_INTERVAL_MS,
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

async function extraOrphanIds(): Promise<string[]> {
  const db = mongoose.connection.db;
  if (!db) return [];
  const ids: string[] = [];
  for (const name of EXTRA_TENANT_COLLECTIONS) {
    ids.push(...((await db.collection(name).distinct("userId", { userId: { $regex: `^${GUEST_ID_PREFIX}` } })) as string[]));
  }
  return ids;
}

export async function cleanupExpiredGuests(): Promise<void> {
  if (running) return;
  running = true;
  try {
    // Drain in batches, bounded per sweep so a backlog can't monopolise the
    // process. A guest whose purge keeps failing is retried next sweep.
    for (let i = 0; i < GUEST_MAX_BATCHES_PER_SWEEP; i++) {
      const expired = await GuestUserModel.find({ expiresAt: { $lt: new Date() } }).limit(
        GUEST_CLEANUP_BATCH
      );
      let removed = 0;
      for (const guest of expired) {
        try {
          await purgeTenantData(guest.id);
          await GuestUserModel.deleteOne({ id: guest.id });
          removed++;
          console.log("[guest-cleanup] removed an expired guest");
        } catch (err) {
          console.error("[guest-cleanup] failed for an expired guest, will retry:", err);
        }
      }
      // Stop when the backlog is drained, or nothing progressed (all failing).
      if (expired.length < GUEST_CLEANUP_BATCH || removed === 0) break;
    }

    // Orphans: rows written by a request that was in flight while its guest was
    // being purged (no GuestUser record left, so the loop above never sees them).
    const guestIds = (await ClientModel.distinct("userId", {
      userId: { $regex: `^${GUEST_ID_PREFIX}` },
    })) as string[];
    const settingsIds = (await UserSettingsModel.distinct("username", {
      username: { $regex: `^${GUEST_ID_PREFIX}` },
    })) as string[];
    const candidates = [...new Set([...guestIds, ...settingsIds, ...(await extraOrphanIds())])].slice(0, GUEST_CLEANUP_BATCH);
    for (const id of candidates) {
      if (await GuestUserModel.exists({ id })) continue;
      try {
        await purgeTenantData(id);
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
