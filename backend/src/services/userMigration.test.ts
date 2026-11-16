import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { MongoMemoryServer } from "mongodb-memory-server";
import { app } from "../app";
import { UserModel } from "../models/User";
import { ClientModel } from "../models/Client";
import { UserSettingsModel } from "../models/UserSettings";
import { AuditLogModel } from "../models/AuditLog";
import { migrateUsersFromEnv, seedSuperadmin, MIGRATION_ACTOR } from "./userMigration";
import { bearer, clearDb, enableUserSystem, startMongo, stopMongo } from "../test/userSystem";

let mongod: MongoMemoryServer;
let restoreFlag: () => void;

beforeAll(async () => {
  mongod = await startMongo("kay-user-migration-test");
  restoreFlag = enableUserSystem();
}, 60000);

afterAll(async () => {
  restoreFlag();
  await stopMongo(mongod);
});

beforeEach(clearDb);

const hashA = bcrypt.hashSync("advisor-a-pass", 4);
const hashB = bcrypt.hashSync("advisor-b-pass", 4);
// Mixed-case name on purpose: the exact env key is the tenant key.
const ENV = { "Advisor.A": hashA, advisorb: hashB } as Record<string, unknown>;

async function seedTenantData(username: string) {
  await ClientModel.create({ id: randomUUID(), userId: username, name: "לקוח", phone: "050-1", documents: [] });
  await UserSettingsModel.create({
    username,
    customKnowledge: [{ id: randomUUID(), text: "כלל לבדיקה", category: "document_validation" }],
  });
}

describe("migrateUsersFromEnv", () => {
  it("dry-run reports the plan and writes nothing", async () => {
    await seedTenantData("Advisor.A");
    const rows = await migrateUsersFromEnv(ENV, { dryRun: true });

    expect(rows).toEqual([
      { username: "Advisor.A", action: "create", clients: 1, hasSettings: true },
      { username: "advisorb", action: "create", clients: 0, hasSettings: false },
    ]);
    expect(await UserModel.countDocuments()).toBe(0);
    expect(await AuditLogModel.countDocuments()).toBe(0);
  });

  it("copies the exact username and bcrypt hash, active, and audits it", async () => {
    await migrateUsersFromEnv(ENV, { dryRun: false });

    const a = await UserModel.findOne({ username: "Advisor.A" }).lean();
    expect(a?.passwordHash).toBe(hashA);
    expect(a?.status).toBe("active");
    expect(a?.role).toBe("member");
    expect(await AuditLogModel.countDocuments({ actor: MIGRATION_ACTOR })).toBe(2);
  });

  it("is idempotent: a second run creates no duplicates", async () => {
    await migrateUsersFromEnv(ENV, { dryRun: false });
    const rows = await migrateUsersFromEnv(ENV, { dryRun: false });

    expect(rows.map((r) => r.action)).toEqual(["skip-exists", "skip-exists"]);
    expect(await UserModel.countDocuments()).toBe(2);
  });

  it("skips reserved names and non-bcrypt entries", async () => {
    const rows = await migrateUsersFromEnv(
      { system: hashA, guest_x: hashA, plain: "plaintext" },
      { dryRun: false }
    );
    expect(rows.map((r) => r.action)).toEqual(["skip-reserved", "skip-reserved", "skip-invalid-hash"]);
    expect(await UserModel.countDocuments()).toBe(0);
  });

  it("migrated user logs in with her current password and sees the same clients and rules", async () => {
    await seedTenantData("Advisor.A");
    await migrateUsersFromEnv(ENV, { dryRun: false });

    const login = await request(app).post("/api/login").send({ username: "Advisor.A", password: "advisor-a-pass" });
    expect(login.status).toBe(200);

    const clients = await request(app).get("/api/clients").set(bearer(login.body.token));
    expect(clients.status).toBe(200);
    expect(clients.body).toHaveLength(1);

    const rules = await request(app)
      .get("/api/settings/knowledge?category=document_validation")
      .set(bearer(login.body.token));
    expect(rules.status).toBe(200);
    expect(rules.body).toHaveLength(1);
  });
});

describe("seedSuperadmin", () => {
  it("grants the role to the existing record and never creates one", async () => {
    await migrateUsersFromEnv(ENV, { dryRun: false });

    expect(await seedSuperadmin("advisorb")).toBe(true);
    expect((await UserModel.findOne({ username: "advisorb" }).lean())?.role).toBe("superadmin");

    expect(await seedSuperadmin("nobody")).toBe(false);
    expect(await UserModel.countDocuments()).toBe(2);
  });
});
