import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { randomUUID } from "crypto";
import { MongoMemoryServer } from "mongodb-memory-server";
import { app } from "../app";
import { ClientModel } from "../models/Client";
import { GuestUserModel } from "../models/GuestUser";
import { GUEST_MESSAGES } from "../constants/messages";
import { GUEST_LIMITS, SYSTEM_USER_ID } from "../constants/guest";
import { consumeGuestQuota, refundGuestQuota } from "../services/guestQuotaService";

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri("kay-guest-test"));
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await ClientModel.deleteMany({});
  await GuestUserModel.deleteMany({});
});

const auth = (username: string, isGuest = false) => ({
  Authorization: `Bearer ${jwt.sign({ username, isGuest }, process.env.JWT_SECRET as string)}`,
});

const seedClient = (userId: string, name = "לקוח בדיקה") =>
  ClientModel.create({ id: randomUUID(), userId, name, phone: "050-1111111", documents: [] });

const seedTemplate = () =>
  ClientModel.create({
    id: randomUUID(),
    userId: SYSTEM_USER_ID,
    isTemplate: true,
    name: "ישראל ישראלי (דוגמה)",
    phone: "050-0000000",
    documents: [{ id: randomUUID(), type: "paystub", filename: "דוגמה.pdf", key: "samples/sample.pdf" }],
  });

describe("POST /api/auth/guest", () => {
  it("creates a guest with a working JWT and a cloned sample client", async () => {
    await seedTemplate();
    const res = await request(app).post("/api/auth/guest");
    expect(res.status).toBe(200);
    expect(res.body.isGuest).toBe(true);
    expect(res.body.username).toMatch(/^guest_/);

    const list = await request(app)
      .get("/api/clients")
      .set({ Authorization: `Bearer ${res.body.token}` });
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].name).toBe("ישראל ישראלי (דוגמה)");
    expect(list.body[0].isTemplate).toBeUndefined();
    expect(list.body[0].documents[0].key).toBe("samples/sample.pdf");
  });

  it("resumes the same account for a known device instead of minting a new one", async () => {
    const first = await request(app).post("/api/auth/guest").send({ deviceId: "device-abc" });
    const second = await request(app).post("/api/auth/guest").send({ deviceId: "device-abc" });
    expect(second.body.username).toBe(first.body.username);
    expect(await GuestUserModel.countDocuments({})).toBe(1);
  });

  it("rejects a valid guest JWT after the guest record is cleaned up", async () => {
    const res = await request(app).post("/api/auth/guest");
    await GuestUserModel.deleteMany({});
    const list = await request(app)
      .get("/api/clients")
      .set({ Authorization: `Bearer ${res.body.token}` });
    expect(list.status).toBe(401);
  });
});

describe("user data isolation", () => {
  it("scopes the client list per user", async () => {
    await seedClient("testuser", "לקוח של הבודק");
    await seedClient("otheruser", "לקוח של האחר");

    const mine = await request(app).get("/api/clients").set(auth("testuser"));
    expect(mine.body).toHaveLength(1);
    expect(mine.body[0].name).toBe("לקוח של הבודק");
  });

  it("404s on another user's client by id (get, patch, delete)", async () => {
    const foreign = await seedClient("otheruser");
    for (const req_ of [
      request(app).get(`/api/clients/${foreign.id}`).set(auth("testuser")),
      request(app).patch(`/api/clients/${foreign.id}`).set(auth("testuser")).send({ name: "x" }),
      request(app).delete(`/api/clients/${foreign.id}`).set(auth("testuser")),
    ]) {
      expect((await req_).status).toBe(404);
    }
    expect(await ClientModel.countDocuments({ userId: "otheruser" })).toBe(1);
  });

  it("blocks presigned-URL generation for another user's document", async () => {
    const foreign = await ClientModel.create({
      id: randomUUID(),
      userId: "otheruser",
      name: "אחר",
      phone: "050-2222222",
      documents: [{ id: "doc-1", type: "other", filename: "a.pdf", key: "uploads/x/a.pdf" }],
    });
    const res = await request(app)
      .get(`/api/upload/${foreign.id}/doc-1/view`)
      .set(auth("testuser"));
    expect(res.status).toBe(404);
  });
});

describe("guest caps", () => {
  it("allows 2 extra clients then 403s with the Hebrew cap message", async () => {
    // Seed the template first so the guest gets a real clone: it carries
    // isSample and must not count against the creation allowance.
    await seedTemplate();
    const { body } = await request(app).post("/api/auth/guest");
    const guestAuth = { Authorization: `Bearer ${body.token}` };

    const payload = { name: "לקוח חדש", phone: "050-3333333" };
    expect((await request(app).post("/api/clients").set(guestAuth).send(payload)).status).toBe(201);
    expect((await request(app).post("/api/clients").set(guestAuth).send(payload)).status).toBe(201);

    const blocked = await request(app).post("/api/clients").set(guestAuth).send(payload);
    expect(blocked.status).toBe(403);
    expect(blocked.body.error).toBe(GUEST_MESSAGES.clientCapReached);
  });

  it("rejects guest prompts longer than 250 chars", async () => {
    const { body } = await request(app).post("/api/auth/guest");
    const res = await request(app)
      .post("/api/chat")
      .set({ Authorization: `Bearer ${body.token}` })
      .send({ message: "א".repeat(251) });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(GUEST_MESSAGES.promptTooLong);
  });

  it("blocks chat once the message quota is spent, with Retry-After", async () => {
    const { body } = await request(app).post("/api/auth/guest");
    for (let i = 0; i < GUEST_LIMITS.chatPerWindow; i++) {
      await consumeGuestQuota(body.username, "chat", GUEST_LIMITS.chatPerWindow);
    }
    const res = await request(app)
      .post("/api/chat")
      .set({ Authorization: `Bearer ${body.token}` })
      .send({ message: "שלום" });
    expect(res.status).toBe(429);
    expect(res.body.error).toBe(GUEST_MESSAGES.chatCapReached);
    // The window just opened, so the wait is the full window.
    expect(res.headers["retry-after"]).toBe(String(GUEST_LIMITS.quotaWindowMs / 1000));
  });

  it("refunds a spent message so a failed reply costs the guest nothing", async () => {
    const { body } = await request(app).post("/api/auth/guest");
    const spend = () =>
      consumeGuestQuota(body.username, "chat", GUEST_LIMITS.chatPerWindow);

    const first = await spend();
    expect(first).toEqual({ allowed: true, remaining: GUEST_LIMITS.chatPerWindow - 1 });

    await refundGuestQuota(body.username, "chat");
    const afterRefund = await spend();
    expect(afterRefund).toEqual({ allowed: true, remaining: GUEST_LIMITS.chatPerWindow - 1 });
  });

  it("never refunds below zero", async () => {
    const { body } = await request(app).post("/api/auth/guest");
    await refundGuestQuota(body.username, "chat");
    const result = await consumeGuestQuota(body.username, "chat", GUEST_LIMITS.chatPerWindow);
    expect(result).toEqual({ allowed: true, remaining: GUEST_LIMITS.chatPerWindow - 1 });
  });

  it("caps document re-extractions per window", async () => {
    const { body } = await request(app).post("/api/auth/guest");
    // Spend the quota directly: the cap must reject before the handler runs,
    // so no real extraction (LLM/R2) is needed to prove it is wired up.
    for (let i = 0; i < GUEST_LIMITS.reExtractsPerWindow; i++) {
      const result = await consumeGuestQuota(
        body.username,
        "reExtract",
        GUEST_LIMITS.reExtractsPerWindow
      );
      expect(result.allowed).toBe(true);
    }
    const res = await request(app)
      .post(`/api/upload/${randomUUID()}/doc-1/re-extract`)
      .set({ Authorization: `Bearer ${body.token}` });
    expect(res.status).toBe(429);
    expect(res.body.error).toBe(GUEST_MESSAGES.reExtractCapReached);
  });
});
