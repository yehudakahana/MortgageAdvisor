import { Schema, model } from "mongoose";
import { GuestUser } from "../types";

// One rolling-window counter (chat messages, document re-extractions). Stored
// on the guest record rather than in memory so signing out and re-entering
// guest mode resumes the same counters — and so a redeploy doesn't reset them.
const QuotaSchema = new Schema(
  {
    count: { type: Number, default: 0 },
    windowStart: { type: Date, default: Date.now },
  },
  { _id: false }
);

// Temporary guest account. The auth middleware treats presence in this
// collection (and a future expiresAt) as the source of truth for guest JWTs,
// so deleting a record here immediately invalidates the matching token.
const GuestUserSchema = new Schema<GuestUser>(
  {
    id: { type: String, required: true, unique: true, index: true }, // guest_<uuid>
    // Stable per-browser id (localStorage). Re-entering guest mode from the
    // same browser resumes this account instead of minting a fresh one.
    deviceId: { type: String, index: true },
    // Creating IP, used to cap how many accounts one origin can hold at once.
    ip: { type: String, index: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    usage: {
      chat: { type: QuotaSchema, default: () => ({}) },
      reExtract: { type: QuotaSchema, default: () => ({}) },
    },
  },
  { versionKey: false }
);

export const GuestUserModel = model<GuestUser>("GuestUser", GuestUserSchema);
