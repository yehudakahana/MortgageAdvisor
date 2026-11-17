import { Schema, model } from "mongoose";
import { AuditLog } from "../types";

// Append-only record of admin actions, user-system scripts and password
// changes. No route updates or deletes these rows. `target` holds the target
// username as text, so a record stays readable after that user is deleted.
const AuditLogSchema = new Schema<AuditLog>(
  {
    id: { type: String, required: true, unique: true },
    actor: { type: String, required: true }, // username, or "system:<script>"
    action: { type: String, required: true },
    target: { type: String, default: null },
    ip: { type: String, default: null },
    meta: { type: Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

export const AuditLogModel = model<AuditLog>("AuditLog", AuditLogSchema);
