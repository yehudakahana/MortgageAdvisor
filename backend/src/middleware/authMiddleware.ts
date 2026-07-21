import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AUTH_MESSAGES } from "../constants/messages";

// Shape of the data we sign into the JWT and expose on req.user.
export interface AuthUser {
  username: string;
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
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
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

  try {
    const payload = jwt.verify(token, secret);
    if (typeof payload === "string" || typeof payload.username !== "string") {
      res.status(401).json({ error: AUTH_MESSAGES.invalidToken });
      return;
    }
    req.user = { username: payload.username };
    console.log(
      `[ACTIVITY LOG] User ${payload.username} made a ${req.method} request to ${req.originalUrl} at ${new Date().toISOString()}`
    );
    next();
  } catch {
    // Do not leak verification internals to the client.
    res.status(401).json({ error: AUTH_MESSAGES.invalidOrExpiredToken });
  }
}
