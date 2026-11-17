import jwt from "jsonwebtoken";
import { getJwtVersion } from "../config/auth";
import { User } from "../types";

// Regular session token for a MongoDB user. Carries the global version `v`
// (JWT_VERSION, unchanged), the account's immutable `uid` and the per-user
// `tv`; all must match on every request. Role is deliberately NOT in the
// token - it is read from the DB.
export function signUserToken(user: User, secret: string, { mfa }: { mfa: boolean }): string {
  const claims: Record<string, unknown> = {
    username: user.username,
    uid: user.id,
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
    { username: user.username, uid: user.id, v: getJwtVersion(), tv: user.tokenVersion, pending2fa: true },
    secret,
    { expiresIn: "5m" }
  );
}

export interface PendingClaims {
  username: string;
  uid: string;
  tv: number;
}

// Returns the claims of a valid pending-2FA token, or null.
export function readPendingMfaToken(token: unknown, secret: string): PendingClaims | null {
  if (typeof token !== "string") return null;
  try {
    const payload = jwt.verify(token, secret);
    if (typeof payload === "string" || payload.pending2fa !== true) return null;
    if (payload.v !== getJwtVersion() || typeof payload.username !== "string") return null;
    if (typeof payload.uid !== "string" || typeof payload.tv !== "number") return null;
    return { username: payload.username, uid: payload.uid, tv: payload.tv };
  } catch {
    return null;
  }
}
