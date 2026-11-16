import { Schema, model } from "mongoose";
import { User } from "../types";

// A regular (non-guest) account. `username` is the immutable tenant key:
// Client.userId and UserSettings.username both hold it, so it must never
// change once data exists. `email` is an extra login handle, not an identifier.
//
// Secrets (passwordHash, TOTP secret, recovery code hashes) live here but are
// never serialized: always respond through toPublicUser() in services/userView.ts.
const UserSchema = new Schema<User>(
  {
    id: { type: String, required: true, unique: true, index: true }, // uuid, public key
    username: { type: String, required: true, unique: true, index: true, immutable: true },
    // Lowercased. Sparse: users migrated from ALLOWED_USERS have none yet.
    email: { type: String, unique: true, sparse: true },
    name: { type: String, default: "" },
    phone: { type: String, default: "" },
    // orgAdmin is reserved for later; only superadmin and member are used.
    role: { type: String, enum: ["superadmin", "orgAdmin", "member"], default: "member" },
    orgId: { type: String, default: null },
    status: { type: String, enum: ["invited", "active", "disabled"], default: "invited" },
    // bcrypt. Null until the user sets a password through an invite link.
    passwordHash: { type: String, default: null },
    // Per-user revocation counter, signed into tokens as `tv`.
    tokenVersion: { type: Number, default: 0 },
    paidUntil: { type: Date, default: null },
    notes: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date, default: null },
    totpSecret: { type: String, default: null }, // base32; set once 2FA is enabled
    totpPendingSecret: { type: String, default: null }, // during enrollment only
    recoveryCodeHashes: { type: [String], default: [] },
  },
  { versionKey: false }
);

export const UserModel = model<User>("User", UserSchema);
