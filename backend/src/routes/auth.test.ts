import { describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../app";
import { getJwtVersion } from "../config/auth";

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

  it("rejects a plaintext ALLOWED_USERS entry with 500 (fail-closed)", async () => {
    const original = process.env.ALLOWED_USERS;
    process.env.ALLOWED_USERS = JSON.stringify({ plainuser: "plainpass" });
    try {
      const res = await request(app)
        .post("/api/login")
        .send({ username: "plainuser", password: "plainpass" });

      expect(res.status).toBe(500);
      expect(res.body.token).toBeUndefined();
    } finally {
      process.env.ALLOWED_USERS = original;
    }
  });
});

describe("token lifetime and version", () => {
  it("issues 12-hour tokens carrying the current version", async () => {
    const res = await request(app)
      .post("/api/login")
      .send({ username: "testuser", password: "testpass" });

    expect(res.status).toBe(200);
    const payload = jwt.decode(res.body.token) as { v: string; exp: number; iat: number };
    expect(payload.v).toBe(getJwtVersion());
    expect(payload.exp - payload.iat).toBe(12 * 3600);
  });

  it("rejects a token signed with a stale JWT_VERSION", async () => {
    const stale = jwt.sign(
      { username: "testuser", v: "stale-version" },
      process.env.JWT_SECRET as string,
      { expiresIn: "12h" }
    );
    const res = await request(app)
      .get("/api/clients")
      .set("Authorization", `Bearer ${stale}`);

    expect(res.status).toBe(401);
  });

  it("attaches req.user for a token with the current version", async () => {
    // Exercise the middleware directly: no DB involved (regular users are
    // checked against ALLOWED_USERS, not Mongo).
    const { authenticateToken } = await import("../middleware/authMiddleware");
    const login = await request(app)
      .post("/api/login")
      .send({ username: "testuser", password: "testpass" });

    const req = { headers: { authorization: `Bearer ${login.body.token}` } } as never;
    let status = 0;
    const res = {
      status: (s: number) => ((status = s), res),
      json: () => res,
    } as never;
    let nextCalled = false;
    await authenticateToken(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(status).toBe(0);
    expect((req as { user?: { username: string } }).user?.username).toBe("testuser");
  });
});
