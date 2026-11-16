import { randomUUID } from "crypto";
import { AuditLogModel } from "../models/AuditLog";

export interface AuditEntry {
  actor: string; // username, or "system:<script name>" for scripts
  action: string;
  target?: string | null; // target username (kept as text: survives deletion)
  ip?: string | null;
  meta?: Record<string, unknown>;
}

// Writes one audit record. Never put secrets (passwords, tokens, links, TOTP
// codes) in `meta`. A failed write is logged loudly but does not undo or fail
// the action that already happened.
export async function logAuditEvent(entry: AuditEntry): Promise<void> {
  try {
    await AuditLogModel.create({
      id: randomUUID(),
      actor: entry.actor,
      action: entry.action,
      target: entry.target ?? null,
      ip: entry.ip ?? null,
      meta: entry.meta ?? {},
      createdAt: new Date(),
    });
  } catch (err) {
    console.error(`[audit] FAILED to record "${entry.action}" by ${entry.actor}:`, err);
  }
}
