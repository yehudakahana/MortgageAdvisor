import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { randomUUID } from "crypto";
import { MongoMemoryServer } from "mongodb-memory-server";
import { ClientModel } from "../models/Client";
import { GuestUserModel } from "../models/GuestUser";
import { UserSettingsModel } from "../models/UserSettings";

const deleteObject = vi.fn<(key: string) => Promise<void>>();
vi.mock("./storageService", () => ({ deleteObject: (k: string) => deleteObject(k) }));

import { cleanupExpiredGuests } from "./guestCleanupService";

let mongod: MongoMemoryServer;
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri("kay-cleanup-test"));
}, 60000);
afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});
beforeEach(async () => {
  deleteObject.mockReset();
  deleteObject.mockResolvedValue(undefined);
  await Promise.all([ClientModel.deleteMany({}), GuestUserModel.deleteMany({}), UserSettingsModel.deleteMany({})]);
});

const seed = async (id: string, keys: string[]) => {
  await ClientModel.create({
    id: randomUUID(),
    userId: id,
    name: "x",
    phone: "050",
    documents: keys.map((key) => ({ id: randomUUID(), type: "paystub", filename: "f.pdf", key })),
  });
  await UserSettingsModel.create({ username: id, customKnowledge: [{ id: "r", text: "rule" }] });
};

describe("cleanupExpiredGuests failure handling", () => {
  it("keeps the guest record, client and rules when an R2 delete fails, then finishes on retry", async () => {
    await GuestUserModel.create({ id: "guest_a", expiresAt: new Date(Date.now() - 1000) });
    await seed("guest_a", ["guest_a/own.pdf"]);
    deleteObject.mockRejectedValueOnce(new Error("R2 down"));

    await cleanupExpiredGuests();
    expect(await GuestUserModel.exists({ id: "guest_a" })).not.toBeNull();
    expect(await ClientModel.countDocuments({ userId: "guest_a" })).toBe(1);

    await cleanupExpiredGuests();
    expect(await GuestUserModel.exists({ id: "guest_a" })).toBeNull();
    expect(await ClientModel.countDocuments({ userId: "guest_a" })).toBe(0);
    expect(await UserSettingsModel.countDocuments({ username: "guest_a" })).toBe(0);
    expect(deleteObject).toHaveBeenLastCalledWith("guest_a/own.pdf");
  });

  it("never deletes shared samples/* objects", async () => {
    await GuestUserModel.create({ id: "guest_b", expiresAt: new Date(Date.now() - 1000) });
    await seed("guest_b", ["samples/sample.pdf", "guest_b/own.pdf"]);
    await cleanupExpiredGuests();
    expect(deleteObject).toHaveBeenCalledTimes(1);
    expect(deleteObject).toHaveBeenCalledWith("guest_b/own.pdf");
  });

  it("one failing guest does not block others in the batch", async () => {
    await GuestUserModel.create({ id: "guest_c", expiresAt: new Date(Date.now() - 1000) });
    await GuestUserModel.create({ id: "guest_d", expiresAt: new Date(Date.now() - 1000) });
    await seed("guest_c", ["c.pdf"]);
    await seed("guest_d", ["d.pdf"]);
    deleteObject.mockImplementation(async (k) => {
      if (k === "c.pdf") throw new Error("boom");
    });
    await cleanupExpiredGuests();
    expect(await GuestUserModel.exists({ id: "guest_c" })).not.toBeNull();
    expect(await GuestUserModel.exists({ id: "guest_d" })).toBeNull();
  });

  it("purges orphaned guest data (late upsert after purge) and leaves system/regular users alone", async () => {
    await seed("guest_late", ["late.pdf"]);
    await seed("system", ["samples/sample.pdf"]);
    await seed("consultant", ["keep.pdf"]);
    await cleanupExpiredGuests();
    expect(await ClientModel.countDocuments({ userId: "guest_late" })).toBe(0);
    expect(await UserSettingsModel.countDocuments({ username: "guest_late" })).toBe(0);
    expect(await ClientModel.countDocuments({ userId: { $in: ["system", "consultant"] } })).toBe(2);
    expect(await UserSettingsModel.countDocuments({ username: { $in: ["system", "consultant"] } })).toBe(2);
  });
});
