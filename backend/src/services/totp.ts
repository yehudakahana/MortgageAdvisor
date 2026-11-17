import { createHmac, randomBytes, timingSafeEqual } from "crypto";

// RFC 6238 TOTP (SHA-1, 6 digits, 30s step) on Node's crypto — the format every
// authenticator app (Google Authenticator, Authy, 1Password) accepts. Written
// in-house instead of adding otplib: it is ~40 lines and avoids a new
// dependency for a single admin account.

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;
const DIGITS = 6;

export function generateTotpSecret(): string {
  const bytes = randomBytes(20);
  let bits = "";
  for (const b of bytes) bits += b.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) out += BASE32[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}

function base32Decode(secret: string): Buffer {
  let bits = "";
  for (const ch of secret.replace(/=+$/, "").toUpperCase()) {
    const idx = BASE32.indexOf(ch);
    if (idx === -1) throw new Error("invalid base32");
    bits += idx.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

export function totpCode(secret: string, timeMs = Date.now()): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(timeMs / 1000 / STEP_SECONDS)));
  const hmac = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const value = (hmac.readUInt32BE(offset) & 0x7fffffff) % 10 ** DIGITS;
  return value.toString().padStart(DIGITS, "0");
}

// Accepts the current step and one step either side (clock drift).
export function verifyTotp(secret: string, code: string, timeMs = Date.now()): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  for (const drift of [-1, 0, 1]) {
    const expected = Buffer.from(totpCode(secret, timeMs + drift * STEP_SECONDS * 1000));
    if (timingSafeEqual(expected, Buffer.from(code))) return true;
  }
  return false;
}

// otpauth:// URI for manual entry or a QR code in the authenticator app.
export function totpUri(secret: string, account: string): string {
  const issuer = "kay.ai";
  return `otpauth://totp/${encodeURIComponent(`${issuer}:${account}`)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&digits=${DIGITS}&period=${STEP_SECONDS}`;
}
