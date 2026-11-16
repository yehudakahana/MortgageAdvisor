import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { randomUUID } from "crypto";
import { MongoMemoryServer } from "mongodb-memory-server";

const deleteObject = vi.fn(async (_key: string) => undefined);
vi.mock("../services/storageService", async (orig) => ({
  ...(await orig<typeof import("../services/storageService")>()),
  deleteObject: (key: string) => deleteObject(key),
}));

import { app } from "../app";
import { UserModel } from "../models/User";
import { ClientModel } from "../models/Client";
import { UserSettingsModel } from "../models/UserSettings";
import { AuditLogModel } from "../models/AuditLog";
import { GuestUserModel } from "../models/GuestUser";
import { generateTotpSecret } from "../services/totp";
import { bearer, clearDb, enableUserSystem, seedUser, startMongo, stopMongo, tokenFor } from "../test/userSystem";

let mongod: MongoMemoryServer;
let restoreFlag: () => void;

beforeAll(async () => {
  mongod = await startMongo("kay-admin-test");
  restoreFlag = enableUserSystem();
}, 60000);

afterAll(async () => {
  restoreFlag();
  await stopMongo(mongod);
});

let admin: Record<string, string>;
beforeEach(async () => {
  await clearDb();
  deleteObject.mockClear();
  await seedUser({ username: "boss", role: "superadmin", totpSecret: generateTotpSecret() });
  admin = bearer(tokenFor("boss", { mfa: true }));
});

describe("admin access control", () => {
  it("rejects members, guests and a superadmin session without 2FA", async () => {
    await seedUser({ username: "advisor1" });
    await GuestUserModel.create({ id: "guest_x", expiresAt: new Date(Date.now() + 60_000) });

    expect((await request(app).get("/api/admin/users").set(bearer(tokenFor("advisor1")))).status).toBe(403);
    expect((await request(app).get("/api/admin/users").set(bearer(tokenFor("guest_x", { isGuest: true })))).status).toBe(403);
    const noMfa = await request(app).get("/api/admin/users").set(bearer(tokenFor("boss")));
    expect(noMfa.status).toBe(403);
    expect(noMfa.body.code).toBe("mfa_required");
  });

  it("does not exist while the user system is off", async () => {
    restoreFlag();
    try {
      expect((await request(app).get("/api/admin/users").set(admin)).status).not.toBe(200);
    } finally {
      restoreFlag = enableUserSystem();
    }
  });
});

describe("account management", () => {
  it("creates an invited user and returns a one-time link with the token in the fragment", async () => {
    const res = await request(app)
      .post("/api/admin/users")
      .set(admin)
      .send({ username: "newadvisor", email: "New@Example.com", name: "יועצת", paidUntil: "2027-01-31" });

    expect(res.status).toBe(201);
    expect(res.body.user.status).toBe("invited");
    expect(res.body.user.email).toBe("new@example.com");
    expect(res.body.link).toMatch(/\/#setup=[A-Za-z0-9_-]{40,}$/);
    expect(await AuditLogModel.countDocuments({ action: "user.created", target: "newadvisor" })).toBe(1);
  });

  it("rejects reserved, malformed and duplicate usernames", async () => {
    await seedUser({ username: "taken" });
    const post = (username: string) =>
      request(app).post("/api/admin/users").set(admin).send({ username, email: `${randomUUID()}@x.io` });

    expect((await post("system")).status).toBe(400);
    expect((await post("guest_abc")).status).toBe(400);
    expect((await post("Bad Name")).status).toBe(400);
    expect((await post("taken")).status).toBe(409);
  });

  it("lists metadata and counts without any secret", async () => {
    await seedUser({ username: "advisor1", totpSecret: "SECRET" });
    await ClientModel.create({
      id: randomUUID(),
      userId: "advisor1",
      name: "לקוח",
      phone: "050-1",
      documents: [{ id: randomUUID(), filename: "a.pdf" }],
    });

    const res = await request(app).get("/api/admin/users").set(admin);
    expect(res.status).toBe(200);
    const row = res.body.find((u: { username: string }) => u.username === "advisor1");
    expect(row).toMatchObject({ clientCount: 1, documentCount: 1, mfaEnabled: true });
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain("passwordHash");
    expect(raw).not.toContain("SECRET");
    expect(raw).not.toContain("recoveryCode");
  });

  it("disable kills open sessions and blocks login; enable restores", async () => {
    const user = await seedUser({ username: "advisor1" });
    const token = bearer(tokenFor("advisor1"));
    expect((await request(app).get("/api/clients").set(token)).status).toBe(200);

    expect((await request(app).post(`/api/admin/users/${user.id}/disable`).set(admin)).status).toBe(200);
    expect((await request(app).get("/api/clients").set(token)).status).toBe(401);

    const enabled = await request(app).post(`/api/admin/users/${user.id}/enable`).set(admin);
    expect(enabled.body.status).toBe("active");
  });

  it("cannot disable or delete itself or a superadmin", async () => {
    const boss = await UserModel.findOne({ username: "boss" }).lean();
    expect((await request(app).post(`/api/admin/users/${boss?.id}/disable`).set(admin)).status).toBe(403);
    const other = await seedUser({ username: "boss2", role: "superadmin" });
    expect((await request(app).post(`/api/admin/users/${other.id}/disable`).set(admin)).status).toBe(403);
    expect(
      (await request(app).delete(`/api/admin/users/${other.id}`).set(admin).send({ confirm: "boss2" })).status
    ).toBe(403);
  });

  it("issues an invite link before a password exists and a reset link after", async () => {
    const invited = await seedUser({ username: "inv", status: "invited", passwordHash: null });
    const active = await seedUser({ username: "act" });
    expect((await request(app).post(`/api/admin/users/${invited.id}/link`).set(admin)).body.type).toBe("invite");
    expect((await request(app).post(`/api/admin/users/${active.id}/link`).set(admin)).body.type).toBe("reset");
  });

  it("delete needs the exact username, purges data and keeps the audit trail", async () => {
    const user = await seedUser({ username: "advisor1" });
    await ClientModel.create({
      id: randomUUID(),
      userId: "advisor1",
      name: "לקוח",
      phone: "050-1",
      documents: [
        { id: randomUUID(), filename: "own.pdf", key: "uploads/x/own.pdf" },
        { id: randomUUID(), filename: "s.pdf", key: "samples/s.pdf" },
      ],
    });
    await UserSettingsModel.create({ username: "advisor1", customKnowledge: [] });

    const wrong = await request(app).delete(`/api/admin/users/${user.id}`).set(admin).send({ confirm: "nope" });
    expect(wrong.status).toBe(400);

    const ok = await request(app).delete(`/api/admin/users/${user.id}`).set(admin).send({ confirm: "advisor1" });
    expect(ok.status).toBe(200);
    expect(deleteObject).toHaveBeenCalledWith("uploads/x/own.pdf");
    expect(deleteObject).not.toHaveBeenCalledWith("samples/s.pdf");
    expect(await ClientModel.countDocuments({ userId: "advisor1" })).toBe(0);
    expect(await UserSettingsModel.countDocuments({ username: "advisor1" })).toBe(0);
    expect(await UserModel.countDocuments({ username: "advisor1" })).toBe(0);

    const audit = await request(app).get("/api/admin/audit").set(admin);
    expect(audit.body.items[0]).toMatchObject({ action: "user.deleted", target: "advisor1", actor: "boss" });
  });
});
