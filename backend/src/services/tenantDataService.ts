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

// Deletes everything owned by one tenant (guest id or username): their own R2
// files, clients, settings (all rule categories) and extra rows. Shared demo
// files under samples/* are never deleted. Throws if any R2 delete fails, so
// the caller keeps the account record and can retry instead of orphaning files.
export async function purgeTenantData(tenantId: string): Promise<void> {
  const clients = await ClientModel.find({ userId: tenantId });
  for (const client of clients) {
    for (const doc of client.documents) {
      if (doc.key && !doc.key.startsWith(SAMPLE_KEY_PREFIX)) await deleteObject(doc.key);
    }
  }
  await ClientModel.deleteMany({ userId: tenantId });
  await UserSettingsModel.deleteOne({ username: tenantId });
  await purgeExtraCollections(tenantId);
}
