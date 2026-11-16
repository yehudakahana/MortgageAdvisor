import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";
import { app } from "../app";
import { UserModel } from "../models/User";
import { GuestUserModel } from "../models/GuestUser";
import { AUTH_MESSAGES } from "../constants/messages";
import { getJwtVersion } from "../config/auth";
import { bearer, clearDb, enableUserSystem, seedUser, startMongo, stopMongo, tokenFor } from "../test/userSystem";

// Login calls share one rate limiter (10 per 15 min per IP) — keep this file
// under that. Middleware cases sign tokens directly instead of logging in.
let mongod: MongoMemoryServer;
let restoreFlag: () => void;

beforeAll(async () => {
  mongod = await startMongo("kay-user-login-test");
  restoreFlag = enableUserSystem();
}, 60000);

afterAll(async () => {
  restoreFlag();
  await stopMongo(mongod);
});

beforeEach(clearDb);

const login = (username: string, password: string) =>
  request(app).post("/api/login").send({ username, password });

describe("POST /api/login with USER_SYSTEM_ENABLED", () => {
  it("logs in from MongoDB, signs v + tv, and records lastLogin", async () => {
    await seedUser({ username: "advisor1", tokenVersion: 3 });
    const res = await login("advisor1", "correct-horse-1");

    expect(res.status).toBe(200);
    expect(res.body.role).toBe("member");
    const claims = jwt.decode(res.body.token) as Record<string, unknown>;
    expect(claims.v).toBe(getJwtVersion());
    expect(claims.tv).toBe(3);
    expect(claims.role).toBeUndefined();
    expect((await UserModel.findOne({ username: "advisor1" }))?.lastLogin).toBeInstanceOf(Date);
  });

  it("accepts the email as the login handle", async () => {
    await seedUser({ username: "advisor1", email: "a@example.com" });
    expect((await login("A@Example.com", "correct-horse-1")).status).toBe(200);
  });

  it("fails closed for a user that exists only in ALLOWED_USERS", async () => {
    // testuser/testpass is in ALLOWED_USERS (test/testEnv.ts) but not in Mongo.
    const res = await login("testuser", "testpass");
    expect(res.status).toBe(401);
    expect(res.body.token).toBeUndefined();
  });

  it("rejects an invited user who has not set a password", async () => {
    await seedUser({ username: "newbie", status: "invited", passwordHash: null });
    expect((await login("newbie", "")).status).toBe(400);
    expect((await login("newbie", "anything-at-all")).status).toBe(401);
  });

  it("rejects a disabled user with 403 (only after the right password)", async () => {
    await seedUser({ username: "gone", status: "disabled" });
    const res = await login("gone", "correct-horse-1");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe(AUTH_MESSAGES.accountDisabled);
  });

  it("rejects a wrong password", async () => {
    await seedUser();
    expect((await login("advisor1", "wrong-password")).status).toBe(401);
  });
});

describe("authenticateToken with USER_SYSTEM_ENABLED", () => {
  it("accepts a token without tv while the user's tokenVersion is 0", async () => {
    await seedUser();
    const res = await request(app).get("/api/clients").set(bearer(tokenFor("advisor1")));
    expect(res.status).toBe(200);
  });

  it("rejects a token after tokenVersion is bumped", async () => {
    await seedUser({ tokenVersion: 1 });
    expect((await request(app).get("/api/clients").set(bearer(tokenFor("advisor1", { tv: 0 })))).status).toBe(401);
    expect((await request(app).get("/api/clients").set(bearer(tokenFor("advisor1", { tv: 1 })))).status).toBe(200);
  });

  it("rejects tokens of disabled and env-only users", async () => {
    await seedUser({ status: "disabled" });
    expect((await request(app).get("/api/clients").set(bearer(tokenFor("advisor1")))).status).toBe(401);
    expect((await request(app).get("/api/clients").set(bearer(tokenFor("testuser")))).status).toBe(401);
  });

  it("rejects a pending-2FA token on regular routes", async () => {
    await seedUser();
    const pending = tokenFor("advisor1", { pending2fa: true });
    expect((await request(app).get("/api/clients").set(bearer(pending))).status).toBe(401);
  });

  it("keeps guest tokens working (global version only)", async () => {
    await GuestUserModel.create({ id: "guest_abc", expiresAt: new Date(Date.now() + 60_000) });
    const res = await request(app).get("/api/clients").set(bearer(tokenFor("guest_abc", { isGuest: true })));
    expect(res.status).toBe(200);
  });
});
