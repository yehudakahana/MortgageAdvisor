import { describe, expect, it } from "vitest";
import { generateTotpSecret, totpCode, verifyTotp } from "./totp";

// RFC 6238 appendix B (SHA-1): secret is ASCII "12345678901234567890", whose
// base32 is below. The RFC lists 8-digit codes; the 6-digit code is their tail.
const RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

describe("totp", () => {
  it("matches the RFC 6238 test vectors", () => {
    expect(totpCode(RFC_SECRET, 59_000)).toBe("287082");
    expect(totpCode(RFC_SECRET, 1_111_111_109_000)).toBe("081804");
    expect(totpCode(RFC_SECRET, 1_234_567_890_000)).toBe("005924");
  });

  it("accepts one step of drift and rejects older codes", () => {
    const now = 1_700_000_000_000;
    const secret = generateTotpSecret();
    expect(verifyTotp(secret, totpCode(secret, now - 30_000), now)).toBe(true);
    expect(verifyTotp(secret, totpCode(secret, now - 90_000), now)).toBe(false);
    expect(verifyTotp(secret, "12345", now)).toBe(false);
  });

  it("generates a 32-char base32 secret", () => {
    expect(generateTotpSecret()).toMatch(/^[A-Z2-7]{32}$/);
  });
});
