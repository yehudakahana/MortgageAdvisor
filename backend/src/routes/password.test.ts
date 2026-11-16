import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { app } from "../app";
import { UserModel } from "../models/User";
import { AuthTokenModel } from "../models/AuthToken";
import { AuditLogModel } from "../models/AuditLog";
import { PASSWORD_MESSAGES } from "../constants/messages";
import { issueLink } from "../services/linkTokenService";
import { bearer, clearDb, enableUserSystem, seedUser, startMongo, stopMongo, tokenFor } from "../test/userSystem";

let mongod: MongoMemoryServer;
let restoreFlag: () => void;

beforeAll(async () => {
  mongod = await startMongo("kay-password-test");
  restoreFlag = enableUserSystem();
}, 60000);

afterAll(async () => {
  restoreFlag();
  await stopMongo(mongod);
});

beforeEach(clearDb);

const tokenOf = (link: string) => link.split("#setup=")[1];
const setPassword = (token: string, password: string) =>
  request(app).post("/api/auth/password/set").send({ token, password });

describe("invite links", () => {
  it("lets an invited user choose a password, become active, and log in", async () => {
    const user = await seedUser({ username: "newbie", status: "invited", passwordHash: null });
    const token = tokenOf(await issueLink(user.id, "invite"));

    const check = await request(app).post("/api/auth/password/check").send({ token });
    expect(check.body).toEqual({ type: "invite", username: "newbie" });

    expect((await setPassword(token, "my-new-password-1")).status).toBe(200);
    const after = await UserModel.findOne({ username: "newbie" }).lean();
    expect(after?.status).toBe("active");
    expect(after?.passwordHash).not.toContain("my-new-password-1");
    expect(await AuditLogModel.countDocuments({ action: "password.set_via_invite" })).toBe(1);

    const login = await request(app).post("/api/login").send({ username: "newbie", password: "my-new-password-1" });
    expect(login.status).toBe(200);
  });

  it("is single use", async () => {
    const user = await seedUser({ username: "newbie", status: "invited", passwordHash: null });
    const token = tokenOf(await issueLink(user.id, "invite"));
    expect((await setPassword(token, "my-new-password-1")).status).toBe(200);
    const reuse = await setPassword(token, "another-password-2");
    expect(reuse.status).toBe(400);
    expect(reuse.body.error).toBe(PASSWORD_MESSAGES.linkInvalid);
  });

  it("rejects expired, unknown and superseded links", async () => {
    const user = await seedUser({ username: "newbie", status: "invited", passwordHash: null });
    const first = tokenOf(await issueLink(user.id, "invite"));
    const second = tokenOf(await issueLink(user.id, "invite"));

    expect((await setPassword(first, "my-new-password-1")).status).toBe(400); // superseded
    expect((await setPassword("x".repeat(43), "my-new-password-1")).status).toBe(400); // unknown

    await AuthTokenModel.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await setPassword(second, "my-new-password-1")).status).toBe(400); // expired
  });

  it("does not burn the link on a too-short password", async () => {
    const user = await seedUser({ username: "newbie", status: "invited", passwordHash: null });
    const token = tokenOf(await issueLink(user.id, "invite"));
    expect((await setPassword(token, "short")).status).toBe(400);
    expect((await setPassword(token, "long-enough-password")).status).toBe(200);
  });

  it("refuses links of a disabled user", async () => {
    const user = await seedUser({ username: "gone", status: "disabled" });
    const token = tokenOf(await issueLink(user.id, "reset"));
    expect((await setPassword(token, "my-new-password-1")).status).toBe(400);
  });
});

describe("reset links", () => {
  it("changes the password, keeps the user active, and logs out old sessions", async () => {
    const user = await seedUser({ username: "advisor1" });
    const old = bearer(tokenFor("advisor1"));
    const token = tokenOf(await issueLink(user.id, "reset"));

    expect((await setPassword(token, "brand-new-password")).status).toBe(200);
    expect((await UserModel.findOne({ username: "advisor1" }).lean())?.status).toBe("active");
    expect((await request(app).get("/api/clients").set(old)).status).toBe(401);
  });
});
