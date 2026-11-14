import { Schema, model } from "mongoose";

// Append-only usage log for product metrics (daily active users, requests per
// user, where the chat/extraction pipeline fails). METADATA ONLY — never the
// chat text, the question, the client's data or any document content. See
// usageService.ts for the write points.
export type UsageEventType =
  | "chat"
  | "chat_failed"
  | "upload"
  | "extraction_done"
  | "extraction_failed";

export interface UsageEvent {
  userId: string;
  type: UsageEventType;
  // Which provider/model actually served a chat (fallbacks included). Not PII.
  provider?: string;
  model?: string;
  usedFallback?: boolean;
  // End-to-end latency of the LLM call in ms, for a rough health signal.
  latencyMs?: number;
  createdAt: Date;
}

const UsageEventSchema = new Schema<UsageEvent>(
  {
    // Advisor username or guest_<uuid>. Indexed: every aggregation groups by it.
    userId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ["chat", "chat_failed", "upload", "extraction_done", "extraction_failed"],
      required: true,
    },
    provider: { type: String },
    model: { type: String },
    usedFallback: { type: Boolean },
    latencyMs: { type: Number },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

// TTL: events self-delete after 180 days so the collection never grows
// unbounded (well inside Atlas M0's 512 MB). Daily metrics don't need older
// raw events; aggregate first if longer history is ever required.
UsageEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 });

// Group/time queries filter by (userId, createdAt).
UsageEventSchema.index({ userId: 1, createdAt: 1 });

export const UsageEventModel = model<UsageEvent>("UsageEvent", UsageEventSchema);
