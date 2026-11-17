import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";
import { app } from "../app";
import { UserModel } from "../models/User";
import { totpCode } from "../services/totp";
import { bearer, clearDb, enableUserSystem, seedUser, startMongo, stopMongo, tokenFor } from "../test/userSystem";

// /api/login and /api/login/2fa share a 10-per-15-min limiter: this file
// stays under it.
let mongod: MongoMemoryServer;
let restoreFlag: () => void;

beforeAll(async () => {
  mongod = await startMongo("kay-admin-mfa-test");
  restoreFlag = enableUserSystem();
}, 60000);

afterAll(async () => {
  restoreFlag();
  await stopMongo(mongod);
});

beforeEach(clearDb);

// Enrolls "boss" through the API and returns the secret + recovery codes.
async function enroll() {
  await seedUser({ username: "boss", role: "superadmin" });
  const token = bearer(await tokenFor("boss"));
  const setup = await request(app).post("/api/admin/2fa/setup").set(token);
  expect(setup.status).toBe(200);
  expect(setup.body.uri).toMatch(/^otpauth:\/\/totp\//);
  const enable = await request(app).post("/api/admin/2fa/enable").set(token).send({ code: totpCode(setup.body.secret) });
  expect(enable.status).toBe(200);
  return { secret: setup.body.secret as string, recoveryCodes: enable.body.recoveryCodes as string[], enable, oldToken: token };
}

describe("2FA enrollment", () => {
  it("enables 2FA, returns an mfa session, and revokes the old session", async () => {
    const { enable, recoveryCodes, oldToken } = await enroll();
    expect(recoveryCodes).toHaveLength(8);
    expect((jwt.decode(enable.body.token) as { mfa?: boolean }).mfa).toBe(true);

    expect((await request(app).get("/api/admin/users").set(bearer(enable.body.token))).status).toBe(200);
    // The pre-enrollment token (tv 0) is dead after the tokenVersion bump.
    expect((await request(app).get("/api/clients").set(oldToken)).status).toBe(401);
  });

  it("refuses a second enrollment once 2FA is on", async () => {
    const { enable } = await enroll();
    const again = await request(app).post("/api/admin/2fa/setup").set(bearer(enable.body.token));
    expect(again.status).toBe(409);
  });

  it("stores recovery codes hashed only", async () => {
    const { recoveryCodes } = await enroll();
    const user = await UserModel.findOne({ username: "boss" }).lean();
    expect(user?.recoveryCodeHashes).toHaveLength(8);
    expect(JSON.stringify(user)).not.toContain(recoveryCodes[0]);
  });
});

describe("superadmin login with 2FA", () => {
  const login = () => request(app).post("/api/login").send({ username: "boss", password: "correct-horse-1" });
  const verify = (pendingToken: string, code: string) =>
    request(app).post("/api/login/2fa").send({ pendingToken, code });

  it("requires the TOTP step and rejects a wrong code", async () => {
    const { secret } = await enroll();
    const first = await login();
    expect(first.body.mfaRequired).toBe(true);
    expect(first.body.token).toBeUndefined();

    expect((await verify(first.body.pendingToken, "000000")).status).toBe(401);
    const ok = await verify(first.body.pendingToken, totpCode(secret));
    expect(ok.status).toBe(200);
    expect((jwt.decode(ok.body.token) as { mfa?: boolean }).mfa).toBe(true);
  });

  it("accepts a recovery code exactly once", async () => {
    const { recoveryCodes } = await enroll();
    const first = await login();
    expect((await verify(first.body.pendingToken, recoveryCodes[0])).status).toBe(200);
    const second = await login();
    expect((await verify(second.body.pendingToken, recoveryCodes[0])).status).toBe(401);
  });
});
