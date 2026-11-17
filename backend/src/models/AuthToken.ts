import { Schema, model } from "mongoose";
import { AuthToken } from "../types";

// One-time invite / password-reset token. Only a SHA-256 of the token is
// stored (the raw value exists only in the link the admin sends), so a DB
// read cannot be turned into a working link. Expired rows are removed by the
// TTL index; used rows stay until then and are rejected by `usedAt`.
const AuthTokenSchema = new Schema<AuthToken>(
  {
    id: { type: String, required: true, unique: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true }, // User.id
    type: { type: String, enum: ["invite", "reset"], required: true },
    generation: { type: Number, required: true }, // User.linkGeneration at issue time
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, expires: 0 }, // TTL index
    usedAt: { type: Date, default: null },
  },
  { versionKey: false }
);

export const AuthTokenModel = model<AuthToken>("AuthToken", AuthTokenSchema);
