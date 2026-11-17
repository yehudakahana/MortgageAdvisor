import { Request, Response, NextFunction } from "express";
import { isUserSystemEnabled } from "../config/features";
import { ADMIN_MESSAGES } from "../constants/messages";

// Gate for /api/admin/*. Runs after authenticateToken, which has just loaded
// the user from MongoDB (status, tokenVersion, role) - so the role checked
// here is the DB value of this request, never a token claim.
// - user system off -> 404 (the admin surface does not exist)
// - guests, members, anyone not superadmin -> 403
// - requireMfa (default): the session must have passed TOTP. Only the 2FA
//   enrollment endpoints and /status run with requireMfa: false.
export function requireAdmin({ requireMfa = true }: { requireMfa?: boolean } = {}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!isUserSystemEnabled()) {
      res.status(404).end();
      return;
    }
    const user = req.user;
    if (!user || user.isGuest || user.role !== "superadmin") {
      res.status(403).json({ error: ADMIN_MESSAGES.forbidden });
      return;
    }
    if (requireMfa && !user.mfa) {
      res.status(403).json({ error: ADMIN_MESSAGES.mfaRequired, code: "mfa_required" });
      return;
    }
    next();
  };
}
