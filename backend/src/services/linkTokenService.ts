import { createHash, randomBytes, randomUUID } from "crypto";
import { AuthTokenModel } from "../models/AuthToken";
import { UserModel } from "../models/User";
import { AuthToken, AuthTokenType, User } from "../types";
import { getAppUrl } from "../config/features";

const TTL_MS: Record<AuthTokenType, number> = {
  invite: 7 * 24 * 60 * 60 * 1000,
  reset: 24 * 60 * 60 * 1000,
};

export function hashLinkToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const isTokenShape = (token: unknown): token is string =>
  typeof token === "string" && token.length >= 20 && token.length <= 100;

// Issues a single-use link for `userId`. The user's linkGeneration is bumped
// atomically and stamped on the token; only the token of the current
// generation is accepted (findValidLink / consumeLink), so two concurrent
// requests can never leave two working links. Only the hash is stored; the
// returned link is shown to the admin once and never logged.
export async function issueLink(userId: string, type: AuthTokenType): Promise<string> {
  const user = await UserModel.findOneAndUpdate(
    { id: userId },
    { $inc: { linkGeneration: 1 } },
    { new: true }
  ).lean<User>();
  if (!user) throw new Error(`issueLink: no user ${userId}`);

  const token = randomBytes(32).toString("base64url");
  await AuthTokenModel.create({
    id: randomUUID(),
    tokenHash: hashLinkToken(token),
    userId,
    type,
    generation: user.linkGeneration,
    expiresAt: new Date(Date.now() + TTL_MS[type]),
  });
  // Housekeeping only (the generation check is what enforces single-link).
  await AuthTokenModel.updateMany(
    { userId, usedAt: null, generation: { $lt: user.linkGeneration } },
    { $set: { usedAt: new Date() } }
  );
  // Fragment, not path/query: never sent to a server, never in a Referer.
  return `${getAppUrl()}/#setup=${token}`;
}

async function isCurrentGeneration(link: AuthToken): Promise<boolean> {
  const user = await UserModel.findOne({ id: link.userId }, { linkGeneration: 1 }).lean<User>();
  return !!user && user.linkGeneration === link.generation;
}

// Read-only lookup of a usable token: unused, not expired, current generation.
export async function findValidLink(token: unknown): Promise<AuthToken | null> {
  if (!isTokenShape(token)) return null;
  const link = await AuthTokenModel.findOne({
    tokenHash: hashLinkToken(token),
    usedAt: null,
    expiresAt: { $gt: new Date() },
  }).lean<AuthToken>();
  return link && (await isCurrentGeneration(link)) ? link : null;
}

// Atomically marks a token as used and returns it; null when it is unknown,
// expired, already used (two concurrent submits can't both win) or superseded
// by a newer link (checked after the consume, so a race burns it harmlessly).
export async function consumeLink(token: unknown): Promise<AuthToken | null> {
  if (!isTokenShape(token)) return null;
  const link = await AuthTokenModel.findOneAndUpdate(
    { tokenHash: hashLinkToken(token), usedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date() } },
    { new: true }
  ).lean<AuthToken>();
  return link && (await isCurrentGeneration(link)) ? link : null;
}
