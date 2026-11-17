import { ADMIN_MESSAGES } from "../constants/messages";
import { EMAIL_PATTERN } from "./userView";

// Validates the editable profile fields of an admin create/update request.
// Returns either the cleaned fields or a Hebrew error message.
export interface ProfileFields {
  email?: string;
  name?: string;
  phone?: string;
  notes?: string;
  paidUntil?: Date | null;
}

const LIMITS = { name: 100, phone: 30, notes: 1000 } as const;

export function parseProfileFields(body: Record<string, unknown>): ProfileFields | { error: string } {
  const out: ProfileFields = {};

  if (body.email !== undefined) {
    if (typeof body.email !== "string") return { error: ADMIN_MESSAGES.invalidEmail };
    const email = body.email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email) || email.length > 200) return { error: ADMIN_MESSAGES.invalidEmail };
    out.email = email;
  }

  for (const key of ["name", "phone", "notes"] as const) {
    const value = body[key];
    if (value === undefined) continue;
    if (typeof value !== "string" || value.length > LIMITS[key]) {
      return { error: ADMIN_MESSAGES.invalidFields };
    }
    out[key] = value.trim();
  }

  if (body.paidUntil !== undefined) {
    if (body.paidUntil === null || body.paidUntil === "") {
      out.paidUntil = null;
    } else {
      const date = typeof body.paidUntil === "string" ? new Date(body.paidUntil) : null;
      if (!date || Number.isNaN(date.getTime())) return { error: ADMIN_MESSAGES.invalidDate };
      out.paidUntil = date;
    }
  }
  return out;
}

// Maps a Mongo duplicate-key error to the matching Hebrew message.
export function duplicateKeyMessage(err: unknown): string | null {
  const e = err as { code?: number; keyPattern?: Record<string, unknown> };
  if (e?.code !== 11000) return null;
  if (e.keyPattern?.email) return ADMIN_MESSAGES.emailTaken;
  return ADMIN_MESSAGES.usernameTaken;
}
