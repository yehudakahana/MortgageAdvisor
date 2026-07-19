import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../app";

// Credentials must match ALLOWED_USERS from src/test/testEnv.ts.
describe("POST /api/login", () => {
  it("returns a signed JWT for valid credentials", async () => {
    const res = await request(app)
      .post("/api/login")
      .send({ username: "testuser", password: "testpass" });

    expect(res.status).toBe(200);
    expect(res.body.username).toBe("testuser");
    expect(typeof res.body.token).toBe("string");
    expect(res.body.token.split(".")).toHaveLength(3);
  });

  it("rejects wrong credentials with 401 and a Hebrew error", async () => {
    const res = await request(app)
      .post("/api/login")
      .send({ username: "testuser", password: "wrong-password" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("פרטי ההתחברות שגויים");
    expect(res.body.token).toBeUndefined();
  });

  it("rejects a missing password with 400", async () => {
    const res = await request(app).post("/api/login").send({ username: "testuser" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("נדרשים שם משתמש וסיסמה");
  });
});
