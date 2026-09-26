import { describe, expect, it, afterEach } from "vitest";
import { getJwtSecret } from "./auth";

// testEnv.ts sets a valid dummy JWT_SECRET; save and restore it around each
// case so these mutations don't leak into other test files.
const ORIGINAL = process.env.JWT_SECRET;

afterEach(() => {
  process.env.JWT_SECRET = ORIGINAL;
});

describe("getJwtSecret", () => {
  it("returns a secret of at least 32 bytes", () => {
    process.env.JWT_SECRET = "a".repeat(32);
    expect(getJwtSecret()).toBe("a".repeat(32));
  });

  it("throws when the secret is missing", () => {
    delete process.env.JWT_SECRET;
    expect(() => getJwtSecret()).toThrow(/not set/);
  });

  it("throws when the secret is shorter than 32 bytes", () => {
    process.env.JWT_SECRET = "changeme";
    expect(() => getJwtSecret()).toThrow(/32 bytes/);
  });
});
