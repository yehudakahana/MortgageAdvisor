import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { UserModel } from "../models/User";
import { AUTH_MESSAGES } from "../constants/messages";
import { signPendingMfaToken, signUserToken, readPendingMfaToken } from "../services/sessionToken";
import { verifyTotp } from "../services/totp";
import { consumeRecoveryCode, looksLikeRecoveryCode } from "../services/recoveryCodes";
import { logAuditEvent } from "../services/auditService";
import { User } from "../types";

// Compared against when no usable account matches, so unknown users, invited
// users (no password yet) and real users take the same time.
const DUMMY_HASH = "$2b$04$GA8Vfp7h6bgR7T33/MFq9OFkp4M0.Nnw7sHNclIuc1p6MajTgIVTW";

async function findLoginUser(identifier: string): Promise<User | null> {
  // Username is matched exactly (migrated names keep their case); email is
  // stored lowercased.
  return UserModel.findOne({
    $or: [{ username: identifier }, { email: identifier.toLowerCase() }],
  }).lean<User>();
}

async function markLoggedIn(user: User): Promise<void> {
  await UserModel.updateOne({ id: user.id }, { $set: { lastLogin: new Date() } });
}

// POST /api/login with USER_SYSTEM_ENABLED. The users collection is the only
// source: ALLOWED_USERS is not consulted (fail closed for env-only users).
// Order: password first, so "disabled" is revealed only to the real owner.
export async function userSystemLogin(req: Request, res: Response, secret: string) {
  const { username, password } = req.body ?? {};
  if (typeof username !== "string" || typeof password !== "string" || !username.trim()) {
    return res.status(400).json({ error: AUTH_MESSAGES.missingCredentials });
  }

  const user = await findLoginUser(username.trim());
  if (!user || !user.passwordHash) {
    await bcrypt.compare(password, DUMMY_HASH);
    return res.status(401).json({ error: AUTH_MESSAGES.badCredentials });
  }
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: AUTH_MESSAGES.badCredentials });
  }
  if (user.status === "disabled") {
    return res.status(403).json({ error: AUTH_MESSAGES.accountDisabled });
  }
  if (user.status !== "active") {
    return res.status(401).json({ error: AUTH_MESSAGES.badCredentials });
  }

  // A superadmin with 2FA enrolled must pass the code step first.
  if (user.role === "superadmin" && user.totpSecret) {
    return res.json({ mfaRequired: true, pendingToken: signPendingMfaToken(user, secret) });
  }

  await markLoggedIn(user);
  return res.json({
    token: signUserToken(user, secret, { mfa: false }),
    username: user.username,
    role: user.role,
  });
}

// POST /api/login/2fa { pendingToken, code } — code is a 6-digit TOTP or a
// one-time recovery code. Returns a full session token with mfa: true.
export async function verifyMfaLogin(req: Request, res: Response, secret: string) {
  const { pendingToken, code } = req.body ?? {};
  const claims = readPendingMfaToken(pendingToken, secret);
  if (!claims) return res.status(401).json({ error: AUTH_MESSAGES.mfaSessionExpired });

  const user = await UserModel.findOne({ username: claims.username }).lean<User>();
  if (!user || user.status !== "active" || user.tokenVersion !== claims.tv || !user.totpSecret) {
    return res.status(401).json({ error: AUTH_MESSAGES.mfaSessionExpired });
  }
  if (typeof code !== "string") return res.status(400).json({ error: AUTH_MESSAGES.mfaCodeInvalid });

  let ok = verifyTotp(user.totpSecret, code.trim());
  if (!ok && looksLikeRecoveryCode(code)) {
    ok = await consumeRecoveryCode(user.id, user.recoveryCodeHashes, code);
    if (ok) {
      await logAuditEvent({ actor: user.username, action: "auth.recovery_code_used", target: user.username, ip: req.ip });
    }
  }
  if (!ok) return res.status(401).json({ error: AUTH_MESSAGES.mfaCodeInvalid });

  await markLoggedIn(user);
  return res.json({
    token: signUserToken(user, secret, { mfa: true }),
    username: user.username,
    role: user.role,
  });
}
