// Grants the superadmin role to the existing user named by ADMIN_USERNAME.
// Run after migrate:users. Never creates a user (a new record would not own
// that user's existing clients and settings).
//
//   ADMIN_USERNAME=<your username> npm run seed:admin
import "dotenv/config";
import mongoose from "mongoose";
import { seedSuperadmin } from "../services/userMigration";

async function main(): Promise<void> {
  const uri = process.env.MONGO_URI;
  const username = process.env.ADMIN_USERNAME;
  if (!uri) throw new Error("MONGO_URI is not set");
  if (!username) throw new Error("ADMIN_USERNAME is not set");

  await mongoose.connect(uri);
  const ok = await seedSuperadmin(username);
  await mongoose.disconnect();
  if (!ok) throw new Error(`no active user "${username}" - run migrate:users first`);
  console.log(`[seed-admin] "${username}" is now superadmin`);
}

main().catch((err) => {
  console.error("[seed-admin] failed:", err);
  process.exit(1);
});
