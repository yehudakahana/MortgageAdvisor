import { randomUUID } from "crypto";
import { UserModel } from "../models/User";
import { ClientModel } from "../models/Client";
import { UserSettingsModel } from "../models/UserSettings";
import { logAuditEvent } from "./auditService";
import { isReservedUsername } from "./userView";

const BCRYPT_PATTERN = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
export const MIGRATION_ACTOR = "system:migrate-users";

export interface MigrationRow {
  username: string;
  action: "create" | "skip-exists" | "skip-reserved" | "skip-invalid-hash";
  clients: number;
  hasSettings: boolean;
}

// Copies every ALLOWED_USERS entry into the users collection, keeping the
// EXACT username (the tenant key existing clients and settings are filed
// under) and the existing bcrypt hash, so every advisor logs in with her
// current password and sees the same data. Idempotent: an existing username is
// left untouched. dryRun reports the plan and writes nothing.
export async function migrateUsersFromEnv(
  allowedUsers: Record<string, unknown>,
  { dryRun }: { dryRun: boolean }
): Promise<MigrationRow[]> {
  const rows: MigrationRow[] = [];
  for (const [username, hash] of Object.entries(allowedUsers)) {
    const clients = await ClientModel.countDocuments({ userId: username });
    const hasSettings = !!(await UserSettingsModel.exists({ username }));
    const row = (action: MigrationRow["action"]) =>
      rows.push({ username, action, clients, hasSettings });

    if (isReservedUsername(username)) {
      row("skip-reserved");
      continue;
    }
    if (typeof hash !== "string" || !BCRYPT_PATTERN.test(hash)) {
      row("skip-invalid-hash");
      continue;
    }
    if (await UserModel.exists({ username })) {
      row("skip-exists");
      continue;
    }
    row("create");
    if (dryRun) continue;

    await UserModel.create({
      id: randomUUID(),
      username,
      passwordHash: hash,
      status: "active",
      role: "member",
    });
    await logAuditEvent({ actor: MIGRATION_ACTOR, action: "user.migrated", target: username });
  }
  return rows;
}

// Grants superadmin to an EXISTING (migrated) user, identified by username.
// Never creates a record: a new record would not own the existing data.
export async function seedSuperadmin(username: string): Promise<boolean> {
  const res = await UserModel.updateOne(
    { username, status: { $ne: "disabled" } },
    { $set: { role: "superadmin" } }
  );
  if (res.matchedCount === 0) return false;
  await logAuditEvent({ actor: "system:seed-admin", action: "user.superadmin_granted", target: username });
  return true;
}
