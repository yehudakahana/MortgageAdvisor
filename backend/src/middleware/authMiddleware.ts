import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { resolveSessionUser, SessionUser } from "../services/sessionUser";
import { UserRole } from "../types";
import { AUTH_MESSAGES } from "../constants/messages";
import { getJwtSecret, getJwtVersion } from "../config/auth";

// Shape of the data exposed on req.user. `id` is the tenant key every data
// query scopes by (User.username / ALLOWED_USERS key, or guest_<uuid>);
// `username` is kept as an alias for existing per-user settings lookups.
export interface AuthUser {
  id: string;
  username: string;
  isGuest: boolean;
  // Set only with USER_SYSTEM_ENABLED, loaded from the DB on every request.
  role?: UserRole;
  // True when this session passed TOTP 2FA (required by requireAdmin).
  mfa?: boolean;
}

// Augment Express' Request so downstream handlers can read req.user type-safely.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Verifies the Bearer token, attaches req.user, and emits an activity log line
// for every successful request (visible in Railway's logging dashboard).
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // A missing or weak signing secret is a config error: fail closed (500),
  // never accept a token we could not have securely signed.
  let secret: string;
  try {
    secret = getJwtSecret();
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    res.status(500).json({ error: AUTH_MESSAGES.serverConfigError });
    return;
  }

  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: AUTH_MESSAGES.missingToken });
    return;
  }

  let username: string;
  let isGuest: boolean;
  let claims: { uid?: unknown; tv?: unknown; mfa?: unknown };
  try {
    const payload = jwt.verify(token, secret);
    if (typeof payload === "string" || typeof payload.username !== "string") {
      res.status(401).json({ error: AUTH_MESSAGES.invalidToken });
      return;
    }
    // Token version check: a JWT_VERSION bump (secret rotation without
    // changing JWT_SECRET) revokes every outstanding token at once. Tokens
    // minted before versioning existed carry no `v` and are rejected.
    if (payload.v !== getJwtVersion()) {
      res.status(401).json({ error: AUTH_MESSAGES.invalidOrExpiredToken });
      return;
    }
    // A half-finished 2FA login token is accepted only by /api/login/2fa.
    if (payload.pending2fa === true) {
      res.status(401).json({ error: AUTH_MESSAGES.invalidOrExpiredToken });
      return;
    }
    username = payload.username;
    isGuest = payload.isGuest === true;
    claims = { uid: payload.uid, tv: payload.tv, mfa: payload.mfa };
  } catch {
    // Do not leak verification internals to the client.
    res.status(401).json({ error: AUTH_MESSAGES.invalidOrExpiredToken });
    return;
  }

  let session: SessionUser | null;
  try {
    session = await resolveSessionUser({ username, isGuest, ...claims });
  } catch (err) {
    console.error("[auth] user existence check failed:", err);
    res.status(500).json({ error: AUTH_MESSAGES.serverConfigError });
    return;
  }

  if (!session) {
    res.status(401).json({ error: AUTH_MESSAGES.invalidOrExpiredToken });
    return;
  }
  req.user = { id: username, username, isGuest, role: session.role, mfa: session.mfa };
  // Guest activity is logged without the guest id or any record ids in the
  // path, so Railway's log retention holds nothing that links back to a guest
  // account after it is purged.
  const who = isGuest ? "A guest" : `User ${username}`;
  const target = isGuest
    ? req.originalUrl.split("?")[0].replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ":id")
    : req.originalUrl;
  console.log(
    `[ACTIVITY LOG] ${who} made a ${req.method} request to ${target} at ${new Date().toISOString()}`
  );
  next();
}
