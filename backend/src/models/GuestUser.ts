import { Schema, model } from "mongoose";
import { GuestUser } from "../types";

// Temporary guest account. The auth middleware treats presence in this
// collection (and a future expiresAt) as the source of truth for guest JWTs,
// so deleting a record here immediately invalidates the matching token.
const GuestUserSchema = new Schema<GuestUser>(
  {
    id: { type: String, required: true, unique: true, index: true }, // guest_<uuid>
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
  },
  { versionKey: false }
);

export const GuestUserModel = model<GuestUser>("GuestUser", GuestUserSchema);
