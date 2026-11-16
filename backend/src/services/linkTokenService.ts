import { createHash, randomBytes, randomUUID } from "crypto";
import { AuthTokenModel } from "../models/AuthToken";
import { AuthToken, AuthTokenType } from "../types";
import { getAppUrl } from "../config/features";

const TTL_MS: Record<AuthTokenType, number> = {
  invite: 7 * 24 * 60 * 60 * 1000,
  reset: 24 * 60 * 60 * 1000,
};

export function hashLinkToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Issues a single-use link for `userId` and invalidates every earlier unused
// link of that user, so regenerating an invite kills the previous one. Only the
// hash is stored; the returned link is shown to the admin once and never logged.
export async function issueLink(userId: string, type: AuthTokenType): Promise<string> {
  await AuthTokenModel.updateMany({ userId, usedAt: null }, { $set: { usedAt: new Date() } });
  const token = randomBytes(32).toString("base64url");
  await AuthTokenModel.create({
    id: randomUUID(),
    tokenHash: hashLinkToken(token),
    userId,
    type,
    expiresAt: new Date(Date.now() + TTL_MS[type]),
  });
  // Fragment, not path/query: never sent to a server, never in a Referer.
  return `${getAppUrl()}/#setup=${token}`;
}

// Read-only lookup of a still-valid token (unused, not expired).
export async function findValidLink(token: string): Promise<AuthToken | null> {
  if (typeof token !== "string" || token.length < 20 || token.length > 100) return null;
  return AuthTokenModel.findOne({
    tokenHash: hashLinkToken(token),
    usedAt: null,
    expiresAt: { $gt: new Date() },
  }).lean();
}

// Atomically marks a valid token as used and returns it; null when it is
// unknown, expired or already used (so two concurrent submits can't both win).
export async function consumeLink(token: string): Promise<AuthToken | null> {
  if (typeof token !== "string" || token.length < 20 || token.length > 100) return null;
  return AuthTokenModel.findOneAndUpdate(
    { tokenHash: hashLinkToken(token), usedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date() } },
    { new: true }
  ).lean();
}
