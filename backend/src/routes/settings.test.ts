import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { app } from "../app";
import { UserSettingsModel } from "../models/UserSettings";
import { SETTINGS_MESSAGES } from "../constants/messages";
import { getJwtVersion } from "../config/auth";

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri("kay-settings-test"));
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await UserSettingsModel.deleteMany({});
});

// The middleware only verifies the signature, so any username can be signed.
const auth = (username = "testuser") => ({
  Authorization: `Bearer ${jwt.sign(
    { username, v: getJwtVersion() },
    process.env.JWT_SECRET as string
  )}`,
});

const addRule = (text: unknown, username?: string) =>
  request(app).post("/api/settings/knowledge").set(auth(username)).send({ text });

describe("/api/settings/knowledge", () => {
  it("rejects requests without a token", async () => {
    const res = await request(app).get("/api/settings/knowledge");
    expect(res.status).toBe(401);
  });

  it("returns an empty list for a user with no rules", async () => {
    const res = await request(app).get("/api/settings/knowledge").set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("adds a rule and returns it via GET", async () => {
    const created = await addRule("תמיד לפתוח בסיכום קצר");
    expect(created.status).toBe(201);
    expect(created.body.id).toBeTypeOf("string");
    expect(created.body.text).toBe("תמיד לפתוח בסיכום קצר");
    expect(created.body.createdAt).toBeTypeOf("string");

    const list = await request(app).get("/api/settings/knowledge").set(auth());
    expect(list.body).toHaveLength(1);
    expect(list.body[0].id).toBe(created.body.id);
  });

  it("trims text and strips newlines on create", async () => {
    const res = await addRule("  כלל עם \r\n כמה \n שורות  ");
    expect(res.status).toBe(201);
    expect(res.body.text).toBe("כלל עם כמה שורות");
  });

  it("rejects empty / whitespace-only / non-string text", async () => {
    for (const bad of ["", "   ", "\n\n", 42, undefined]) {
      const res = await addRule(bad);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe(SETTINGS_MESSAGES.emptyRule);
    }
  });

  it("rejects text longer than 200 chars", async () => {
    const res = await addRule("א".repeat(201));
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(SETTINGS_MESSAGES.ruleTooLong);
  });

  it("rejects an exact duplicate after trim", async () => {
    await addRule("כלל כפול");
    const res = await addRule("  כלל כפול  ");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(SETTINGS_MESSAGES.duplicateRule);
  });

  it("rejects the 26th rule but still allows editing at the cap", async () => {
    for (let i = 1; i <= 25; i++) expect((await addRule(`כלל ${i}`)).status).toBe(201);

    const overflow = await addRule("כלל 26");
    expect(overflow.status).toBe(400);
    expect(overflow.body.error).toBe(SETTINGS_MESSAGES.ruleLimitReached);

    const list = await request(app).get("/api/settings/knowledge").set(auth());
    const edited = await request(app)
      .put(`/api/settings/knowledge/${list.body[0].id}`)
      .set(auth())
      .send({ text: "כלל ערוך" });
    expect(edited.status).toBe(200);
    expect(edited.body.text).toBe("כלל ערוך");
    expect(edited.body.updatedAt).toBeTypeOf("string");
  });

  it("validates text on edit and 404s on an unknown ruleId", async () => {
    const created = await addRule("כלל מקורי");
    const tooLong = await request(app)
      .put(`/api/settings/knowledge/${created.body.id}`)
      .set(auth())
      .send({ text: "א".repeat(201) });
    expect(tooLong.status).toBe(400);

    const missing = await request(app)
      .put("/api/settings/knowledge/no-such-id")
      .set(auth())
      .send({ text: "טקסט תקין" });
    expect(missing.status).toBe(404);
    expect(missing.body.error).toBe(SETTINGS_MESSAGES.ruleNotFound);
  });

  it("rejects editing a rule into a duplicate of another rule, but allows re-saving its own text", async () => {
    const first = await addRule("כלל ראשון");
    const second = await addRule("כלל שני");

    const dup = await request(app)
      .put(`/api/settings/knowledge/${second.body.id}`)
      .set(auth())
      .send({ text: "כלל ראשון" });
    expect(dup.status).toBe(400);
    expect(dup.body.error).toBe(SETTINGS_MESSAGES.duplicateRule);

    const same = await request(app)
      .put(`/api/settings/knowledge/${first.body.id}`)
      .set(auth())
      .send({ text: "כלל ראשון" });
    expect(same.status).toBe(200);
  });

  it("deletes a rule by id", async () => {
    const created = await addRule("כלל למחיקה");
    const res = await request(app)
      .delete(`/api/settings/knowledge/${created.body.id}`)
      .set(auth());
    expect(res.status).toBe(200);

    const list = await request(app).get("/api/settings/knowledge").set(auth());
    expect(list.body).toEqual([]);
  });

  it("404s when deleting another user's ruleId and keeps their rule intact", async () => {
    const created = await addRule("כלל של משתמש אחר", "otheruser");
    const res = await request(app)
      .delete(`/api/settings/knowledge/${created.body.id}`)
      .set(auth("testuser"));
    expect(res.status).toBe(404);

    const otherList = await request(app)
      .get("/api/settings/knowledge")
      .set(auth("otheruser"));
    expect(otherList.body).toHaveLength(1);
  });
});
