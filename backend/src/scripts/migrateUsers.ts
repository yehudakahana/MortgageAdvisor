// Copies ALLOWED_USERS (env) into the MongoDB users collection.
//
//   npm run migrate:users -- --dry-run   # print the plan, write nothing
//   npm run migrate:users                # apply (idempotent, safe to re-run)
//
// Uses MONGO_URI and ALLOWED_USERS from .env. Run the dry-run against a copy of
// production first and check every advisor's client count.
import "dotenv/config";
import mongoose from "mongoose";
import { migrateUsersFromEnv } from "../services/userMigration";

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is not set");
  const allowed = JSON.parse(process.env.ALLOWED_USERS ?? "{}") as Record<string, unknown>;

  await mongoose.connect(uri);
  console.log(`[migrate-users] connected${dryRun ? " (DRY RUN - nothing is written)" : ""}`);

  const rows = await migrateUsersFromEnv(allowed, { dryRun });
  console.table(rows);

  const unhandled = rows.filter((r) => r.action.startsWith("skip-") && r.action !== "skip-exists");
  if (unhandled.length) console.warn("[migrate-users] some entries were skipped - check the table");

  await mongoose.disconnect();
  console.log("[migrate-users] done");
}

main().catch((err) => {
  console.error("[migrate-users] failed:", err);
  process.exit(1);
});
