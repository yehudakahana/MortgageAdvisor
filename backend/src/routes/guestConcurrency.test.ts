import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

// Only the outside world is mocked (R2, LLM extraction). MongoDB is real, and
// there is NO in-process serialisation anywhere: every invariant below is held
// by the database (unique indexes / conditional updates), so parallel requests
// here race exactly as they would across instances.
const uploadObject = vi.fn<(p: unknown) => Promise<void>>();
const safeDeleteObject = vi.fn<(k: string) => Promise<void>>();
vi.mock("../services/storageService", async (orig) => ({
  ...(await orig<typeof import("../services/storageService")>()),
  uploadObject: (p: unknown) => uploadObject(p),
  safeDeleteObject: (k: string) => safeDeleteObject(k),
  deleteObject: async () => undefined,
}));
vi.mock("../services/extractionService", () => ({
  extractFromBuffer: async () => ({ rawText: "x" }),
}));

import { app } from "../app";
import { ClientModel } from "../models/Client";
import { GuestUserModel } from "../models/GuestUser";
import { GUEST_LIMITS } from "../constants/guest";
import { consumeGuestQuota } from "../services/guestQuotaService";

let mongod: MongoMemoryServer;
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri("kay-guest-conc-test"));
  await GuestUserModel.init();
}, 60000);
afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});
beforeEach(async () => {
  uploadObject.mockReset().mockResolvedValue(undefined);
  safeDeleteObject.mockReset().mockResolvedValue(undefined);
  await ClientModel.deleteMany({});
  await GuestUserModel.deleteMany({});
});

const signIn = async (deviceId: string) => {
  const r = await request(app).post("/api/auth/guest").send({ deviceId });
  expect(r.status).toBe(200);
  return { id: r.body.username as string, h: { Authorization: `Bearer ${r.body.token}` } };
};
const counters = async (id: string) => {
  const g = await GuestUserModel.findOne({ id });
  return { ownClients: g?.ownClients ?? 0, uploads: g?.uploads ?? 0 };
};
const pdf = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
const upload = (g: { h: Record<string, string> }, clientId: string) =>
  request(app).post(`/api/upload/${clientId}`).set(g.h).attach("file", pdf, "a.pdf");

describe("simultaneous guest sign-in (database-enforced)", () => {
  it("same device, 8 parallel -> one live account, every request gets it", async () => {
    const rs = await Promise.all(
      Array.from({ length: 8 }, () => request(app).post("/api/auth/guest").send({ deviceId: "dev-1" }))
    );
    expect(rs.every((r) => r.status === 200)).toBe(true);
    expect(await GuestUserModel.countDocuments({ deviceId: "dev-1" })).toBe(1);
    expect(new Set(rs.map((r) => r.body.username)).size).toBe(1);
  });

  it("same IP, 10 different devices in parallel -> never more than the cap, no stray accounts", async () => {
    const rs = await Promise.all(
      Array.from({ length: 10 }, (_, i) => request(app).post("/api/auth/guest").send({ deviceId: `d${i}` }))
    );
    const live = await GuestUserModel.countDocuments({});
    expect(live).toBe(GUEST_LIMITS.activeGuestsPerIp);
    expect(rs.filter((r) => r.status === 200).length).toBe(live);
    expect(rs.every((r) => r.status === 200 || r.status === 429)).toBe(true);
  });

  it("the unique indexes themselves reject a duplicate device / ip slot", async () => {
    const exp = new Date(Date.now() + 60000);
    await GuestUserModel.create({ id: "guest_1", deviceId: "x", ip: "1.1.1.1", ipSlot: 0, expiresAt: exp });
    await expect(GuestUserModel.create({ id: "guest_2", deviceId: "x", ip: "2.2.2.2", ipSlot: 0, expiresAt: exp })).rejects.toMatchObject({ code: 11000 });
    await expect(GuestUserModel.create({ id: "guest_3", deviceId: "y", ip: "1.1.1.1", ipSlot: 0, expiresAt: exp })).rejects.toMatchObject({ code: 11000 });
  });

  it("an expired account never blocks its device or IP slots", async () => {
    // supertest IP is the same for every request, so occupy the slots with expired accounts.
    const first = await request(app).post("/api/auth/guest").send({ deviceId: "dev-e" });
    await GuestUserModel.updateMany({}, { expiresAt: new Date(Date.now() - 1000) });
    const again = await request(app).post("/api/auth/guest").send({ deviceId: "dev-e" });
    expect(again.status).toBe(200);
    expect(again.body.username).not.toBe(first.body.username);
  });

  it("different devices get separate accounts", async () => {
    const a = await signIn("x");
    const b = await signIn("y");
    expect(a.id).not.toBe(b.id);
  });
});

describe("atomic guest quota", () => {
  it("30 parallel spends against a cap of 20 allow exactly 20", async () => {
    await GuestUserModel.create({ id: "guest_q", expiresAt: new Date(Date.now() + 60000) });
    const rs = await Promise.all(Array.from({ length: 30 }, () => consumeGuestQuota("guest_q", "chat", 20)));
    expect(rs.filter((r) => r.allowed).length).toBe(20);
    expect((await GuestUserModel.findOne({ id: "guest_q" }))?.usage?.chat?.count).toBe(20);
  });

  it("a rolled-over window restarts the count once under parallel requests", async () => {
    await GuestUserModel.create({
      id: "guest_w",
      expiresAt: new Date(Date.now() + 60000),
      usage: { chat: { count: 20, windowStart: new Date(Date.now() - GUEST_LIMITS.quotaWindowMs - 1000) } },
    });
    const rs = await Promise.all(Array.from({ length: 5 }, () => consumeGuestQuota("guest_w", "chat", 20)));
    expect(rs.every((r) => r.allowed)).toBe(true);
    expect((await GuestUserModel.findOne({ id: "guest_w" }))?.usage?.chat?.count).toBe(5);
  });
});

describe("atomic client cap", () => {
  it("12 parallel creates -> exactly the allowance; delete frees a slot; double delete frees once", async () => {
    const g = await signIn("c1");
    const mk = () => request(app).post("/api/clients").set(g.h).send({ name: "n", phone: "050" });
    const rs = await Promise.all(Array.from({ length: 12 }, mk));
    const ok = rs.filter((r) => r.status === 201);
    expect(ok.length).toBe(GUEST_LIMITS.extraClients);
    expect(rs.filter((r) => r.status === 403).length).toBe(12 - ok.length);
    expect(await ClientModel.countDocuments({ userId: g.id, isSample: { $ne: true } })).toBe(GUEST_LIMITS.extraClients);
    expect((await counters(g.id)).ownClients).toBe(GUEST_LIMITS.extraClients);

    const id = ok[0].body.id;
    const dels = await Promise.all([1, 2, 3].map(() => request(app).delete(`/api/clients/${id}`).set(g.h)));
    expect(dels.filter((r) => r.status === 200).length).toBe(1);
    expect((await counters(g.id)).ownClients).toBe(GUEST_LIMITS.extraClients - 1);
    expect((await mk()).status).toBe(201);
    expect((await mk()).status).toBe(403);
  });

  it("a failed create releases its slot (validation error does not leak one)", async () => {
    const g = await signIn("c2");
    const bad = await request(app).post("/api/clients").set(g.h).send({ name: "", phone: "" });
    expect(bad.status).toBe(400);
    expect((await counters(g.id)).ownClients).toBe(0);
  });
});

describe("atomic upload cap", () => {
  const setup = async (dev: string) => {
    const g = await signIn(dev);
    const c = await request(app).post("/api/clients").set(g.h).send({ name: "n", phone: "050" });
    return { g, clientId: c.body.id as string };
  };

  it("15 parallel uploads -> exactly the allowance succeed, counter and documents agree", async () => {
    const { g, clientId } = await setup("u1");
    const rs = await Promise.all(Array.from({ length: 15 }, () => upload(g, clientId)));
    const ok = rs.filter((r) => r.status === 201).length;
    expect(ok).toBe(GUEST_LIMITS.uploads);
    expect(rs.filter((r) => r.status === 403).length).toBe(15 - ok);
    const client = await ClientModel.findOne({ id: clientId });
    expect(client?.documents.length).toBe(GUEST_LIMITS.uploads);
    expect((await counters(g.id)).uploads).toBe(GUEST_LIMITS.uploads);
    expect(uploadObject).toHaveBeenCalledTimes(GUEST_LIMITS.uploads); // over-cap requests never touched R2
  });

  it("R2 failure releases the slot", async () => {
    const { g, clientId } = await setup("u2");
    uploadObject.mockRejectedValueOnce(new Error("R2 down"));
    expect((await upload(g, clientId)).status).toBe(500);
    expect((await counters(g.id)).uploads).toBe(0);
  });

  it("unknown client (404) releases the slot and removes the orphan R2 object", async () => {
    const { g } = await setup("u3");
    const r = await upload(g, "no-such-client");
    expect(r.status).toBe(404);
    expect((await counters(g.id)).uploads).toBe(0);
    expect(safeDeleteObject).toHaveBeenCalledTimes(1);
  });

  it("doc delete frees a slot exactly once under parallel deletes; client delete frees all its docs", async () => {
    const { g, clientId } = await setup("u4");
    for (let i = 0; i < 3; i++) await upload(g, clientId);
    expect((await counters(g.id)).uploads).toBe(3);
    const client = await ClientModel.findOne({ id: clientId });
    const docId = client!.documents[0].id;
    const dels = await Promise.all([1, 2, 3].map(() => request(app).delete(`/api/upload/${clientId}/${docId}`).set(g.h)));
    expect(dels.filter((r) => r.status === 200).length).toBe(1);
    expect((await counters(g.id)).uploads).toBe(2);
    await request(app).delete(`/api/clients/${clientId}`).set(g.h);
    expect(await counters(g.id)).toEqual({ ownClients: 0, uploads: 0 });
  });

  it("sample documents never use or free upload slots", async () => {
    const g = await signIn("u5");
    const sample = await ClientModel.create({
      id: "smp", userId: g.id, isSample: true, name: "s", phone: "1",
      documents: [{ id: "sd", type: "other", filename: "s.pdf", key: "samples/s.pdf" }],
    });
    expect(sample.documents.length).toBe(1);
    const del = await request(app).delete(`/api/upload/smp/sd`).set(g.h);
    expect(del.status).toBe(200);
    expect((await counters(g.id)).uploads).toBe(0);
  });
});
