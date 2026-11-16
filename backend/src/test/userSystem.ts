// Shared helpers for user-system tests (in-memory Mongo, seeded users, tokens).
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { MongoMemoryServer } from "mongodb-memory-server";
import { UserModel } from "../models/User";
import { getJwtVersion } from "../config/auth";
import { User } from "../types";

export async function startMongo(dbName: string): Promise<MongoMemoryServer> {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(dbName));
  return mongod;
}

export async function stopMongo(mongod: MongoMemoryServer): Promise<void> {
  await mongoose.disconnect();
  await mongod.stop();
}

export async function clearDb(): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) return;
  for (const c of await db.collections()) await c.deleteMany({});
}

export async function seedUser(overrides: Partial<User> & { password?: string } = {}): Promise<User> {
  const { password, ...rest } = overrides;
  const doc = await UserModel.create({
    id: randomUUID(),
    username: "advisor1",
    status: "active",
    role: "member",
    passwordHash: password === undefined ? bcrypt.hashSync("correct-horse-1", 4) : bcrypt.hashSync(password, 4),
    ...rest,
  });
  return doc.toObject();
}

// Signs a session token directly (bypasses login) with the given claims.
export function tokenFor(username: string, extra: Record<string, unknown> = {}): string {
  return jwt.sign({ username, v: getJwtVersion(), ...extra }, process.env.JWT_SECRET as string, {
    expiresIn: "1h",
  });
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

export function enableUserSystem(): () => void {
  const previous = process.env.USER_SYSTEM_ENABLED;
  process.env.USER_SYSTEM_ENABLED = "true";
  return () => {
    if (previous === undefined) delete process.env.USER_SYSTEM_ENABLED;
    else process.env.USER_SYSTEM_ENABLED = previous;
  };
}
