import mongoose from "mongoose";
import { ClientModel } from "../models/Client";
import { UserSettingsModel } from "../models/UserSettings";
import { deleteObject } from "./storageService";
import { SAMPLE_KEY_PREFIX } from "../constants/guest";

// Collections that may hold tenant-keyed rows but have no model on this branch.
// "usageevents" is written by the unmerged usage-metadata-logging /
// admin-usage-endpoint branches (userId = tenant id), so it is purged through
// the raw driver: a missing collection is a harmless no-op.
export const EXTRA_TENANT_COLLECTIONS = ["usageevents"];

async function purgeExtraCollections(tenantId: string): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) return;
  for (const name of EXTRA_TENANT_COLLECTIONS) {
    await db.collection(name).deleteMany({ userId: tenantId });
  }
}

// Clients being purged are parked under this prefix: out of the tenant's
// scope (every route filters by userId) but still findable for a retry.
export const PURGE_PREFIX = "purging:";
const MAX_PASSES = 3;

async function purgeParkedClients(parkedId: string): Promise<void> {
  const clients = await ClientModel.find({ userId: parkedId });
  for (const client of clients) {
    for (const doc of client.documents) {
      if (doc.key && !doc.key.startsWith(SAMPLE_KEY_PREFIX)) await deleteObject(doc.key);
    }
  }
  await ClientModel.deleteMany({ userId: parkedId });
}

// Deletes everything owned by one tenant (guest id or username): their own R2
// files, clients, settings (all rule categories) and extra rows. Shared demo
// files under samples/* are never deleted.
//
// Race-safe against writes still in flight: each client is first re-keyed to
// "purging:<tenant>" atomically, so an upload either lands before the re-key
// (its document is in the snapshot we delete) or misses the client and cleans
// up its own R2 object (uploadController 404 path). Repeated until a pass
// finds nothing new, to catch clients created mid-purge.
//
// Throws if any R2 delete fails; parked clients stay parked, so calling this
// again for the same tenant resumes where it stopped (no orphaned files).
export async function purgeTenantData(tenantId: string): Promise<void> {
  const parkedId = `${PURGE_PREFIX}${tenantId}`;
  await purgeParkedClients(parkedId); // leftovers of an earlier failed attempt
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const parked = await ClientModel.updateMany({ userId: tenantId }, { $set: { userId: parkedId } });
    if (parked.modifiedCount === 0) break;
    await purgeParkedClients(parkedId);
  }
  await UserSettingsModel.deleteOne({ username: tenantId });
  await purgeExtraCollections(tenantId);
}
