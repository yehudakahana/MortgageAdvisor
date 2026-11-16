import { GuestUserModel } from "../models/GuestUser";
import { UserModel } from "../models/User";
import { isUserSystemEnabled } from "../config/features";
import { User, UserRole } from "../types";

export interface TokenClaims {
  username: string;
  isGuest: boolean;
  tv?: unknown; // per-user tokenVersion (regular users, user system only)
  mfa?: unknown; // true when the session passed TOTP (superadmin only)
}

export interface SessionUser {
  role?: UserRole;
  mfa: boolean;
}

// A valid signature is not enough: the account behind the token must still be
// allowed in. Returns null to reject.
// - Guests: present in GuestUser and not expired. Only the global `v` applies.
// - User system ON: the record exists, status is "active", and the token's
//   `tv` (missing = 0) matches the record, so disable / force-logout / password
//   change revoke immediately. Role comes from the DB, never from the token.
// - User system OFF: the username is still a key in ALLOWED_USERS (legacy).
export async function resolveSessionUser(claims: TokenClaims): Promise<SessionUser | null> {
  if (claims.isGuest) {
    const guest = await GuestUserModel.findOne({ id: claims.username });
    return guest && guest.expiresAt.getTime() > Date.now() ? { mfa: false } : null;
  }

  if (isUserSystemEnabled()) {
    const user = await UserModel.findOne({ username: claims.username }).lean<User>();
    if (!user || user.status !== "active") return null;
    const tokenVersion = typeof claims.tv === "number" ? claims.tv : 0;
    if (tokenVersion !== user.tokenVersion) return null;
    return { role: user.role, mfa: claims.mfa === true && !!user.totpSecret };
  }

  try {
    const allowed = JSON.parse(process.env.ALLOWED_USERS ?? "{}");
    return typeof allowed[claims.username] === "string" ? { mfa: false } : null;
  } catch {
    return null;
  }
}
