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
    deviceId: { type: String },
    // Creating IP, used to cap how many accounts one origin can hold at once.
    ip: { type: String, index: true },
    // Slot 0..activeGuestsPerIp-1 within an IP. The unique (ip, ipSlot) index below
    // is what makes the per-IP cap atomic: an account can only be created by
    // claiming a free slot. Cleared on expiry so a dead account never blocks.
    ipSlot: { type: Number },
    // Atomic caps: reserved with a conditional $inc BEFORE the write, released on
    // failure and on delete. Missing on accounts created before this change = 0.
    ownClients: { type: Number, default: 0 },
    uploads: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    usage: {
      chat: { type: QuotaSchema, default: () => ({}) },
      reExtract: { type: QuotaSchema, default: () => ({}) },
    },
  },
  { versionKey: false }
);

// One live account per device and per (ip, slot): unique partial indexes, so two
// simultaneous sign-ins cannot both insert. Expired accounts have deviceId and
// ipSlot unset by the next sign-in, so they never block a new account.
// Deploy note: building the deviceId index fails if the live collection already
// holds duplicate deviceIds (possible from the old race); dedupe first.
GuestUserSchema.index(
  { deviceId: 1 },
  { unique: true, partialFilterExpression: { deviceId: { $type: "string" } }, name: "deviceId_unique_live" }
);
GuestUserSchema.index(
  { ip: 1, ipSlot: 1 },
  { unique: true, partialFilterExpression: { ipSlot: { $type: "number" } }, name: "ip_slot_unique_live" }
);

export const GuestUserModel = model<GuestUser>("GuestUser", GuestUserSchema);
