import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { GuestUserModel } from "../models/GuestUser";
import { AUTH_MESSAGES } from "../constants/messages";

// Shape of the data exposed on req.user. `id` is the tenant key every data
// query scopes by (ALLOWED_USERS username, or guest_<uuid> for guests);
// `username` is kept as an alias for existing per-user settings lookups.
export interface AuthUser {
  id: string;
  username: string;
  isGuest: boolean;
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

// A valid signature is not enough: the user must still exist. Guests are
// checked against the GuestUser collection (a cleaned-up or expired guest
// holding a still-valid JWT gets a 401); regular users must still be present
// in the ALLOWED_USERS env map.
async function userStillExists(username: string, isGuest: boolean): Promise<boolean> {
  if (isGuest) {
    const guest = await GuestUserModel.findOne({ id: username });
    return !!guest && guest.expiresAt.getTime() > Date.now();
  }
  try {
    const allowed = JSON.parse(process.env.ALLOWED_USERS ?? "{}");
    return typeof allowed[username] === "string";
  } catch {
    return false;
  }
}

// Verifies the Bearer token, attaches req.user, and emits an activity log line
// for every successful request (visible in Railway's logging dashboard).
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("[CONFIG ERROR] JWT_SECRET is not set; cannot verify tokens.");
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
  try {
    const payload = jwt.verify(token, secret);
    if (typeof payload === "string" || typeof payload.username !== "string") {
      res.status(401).json({ error: AUTH_MESSAGES.invalidToken });
      return;
    }
    username = payload.username;
    isGuest = payload.isGuest === true;
  } catch {
    // Do not leak verification internals to the client.
    res.status(401).json({ error: AUTH_MESSAGES.invalidOrExpiredToken });
    return;
  }

  try {
    if (!(await userStillExists(username, isGuest))) {
      res.status(401).json({ error: AUTH_MESSAGES.invalidOrExpiredToken });
      return;
    }
  } catch (err) {
    console.error("[auth] user existence check failed:", err);
    res.status(500).json({ error: AUTH_MESSAGES.serverConfigError });
    return;
  }

  req.user = { id: username, username, isGuest };
  console.log(
    `[ACTIVITY LOG] User ${username} made a ${req.method} request to ${req.originalUrl} at ${new Date().toISOString()}`
  );
  next();
}
