import jwt from "jsonwebtoken";
import { getJwtVersion } from "../config/auth";
import { User } from "../types";

// Regular session token for a MongoDB user. Carries the global version `v`
// (JWT_VERSION, unchanged) AND the per-user `tv`; both must match on every
// request. Role is deliberately NOT in the token - it is read from the DB.
export function signUserToken(user: User, secret: string, { mfa }: { mfa: boolean }): string {
  const claims: Record<string, unknown> = {
    username: user.username,
    v: getJwtVersion(),
    tv: user.tokenVersion,
  };
  if (mfa) claims.mfa = true;
  return jwt.sign(claims, secret, { expiresIn: "12h" });
}

// Short-lived token between the password step and the TOTP step of a
// superadmin login. authenticateToken rejects it; only /api/login/2fa reads it.
export function signPendingMfaToken(user: User, secret: string): string {
  return jwt.sign(
    { username: user.username, v: getJwtVersion(), tv: user.tokenVersion, pending2fa: true },
    secret,
    { expiresIn: "5m" }
  );
}

export interface PendingClaims {
  username: string;
  tv: number;
}

// Returns the claims of a valid pending-2FA token, or null.
export function readPendingMfaToken(token: unknown, secret: string): PendingClaims | null {
  if (typeof token !== "string") return null;
  try {
    const payload = jwt.verify(token, secret);
    if (typeof payload === "string" || payload.pending2fa !== true) return null;
    if (payload.v !== getJwtVersion() || typeof payload.username !== "string") return null;
    return { username: payload.username, tv: typeof payload.tv === "number" ? payload.tv : 0 };
  } catch {
    return null;
  }
}
