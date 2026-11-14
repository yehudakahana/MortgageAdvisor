import { Request, Response, NextFunction } from "express";
import { AUTH_MESSAGES } from "../constants/messages";

// Admin usernames, comma-separated in ADMIN_USERS. Must be a subset of the
// ALLOWED_USERS keys; a username here that cannot log in simply never matches.
function adminUsers(): Set<string> {
  return new Set(
    (process.env.ADMIN_USERS ?? "")
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean)
  );
}

// Gate for admin-only routes. Runs AFTER authenticateToken, so req.user is set.
// Guests are always rejected; regular users must be listed in ADMIN_USERS.
// Fails closed: an empty/unset ADMIN_USERS denies everyone.
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = req.user;
  if (!user || user.isGuest || !adminUsers().has(user.username)) {
    res.status(403).json({ error: AUTH_MESSAGES.forbidden });
    return;
  }
  next();
}
