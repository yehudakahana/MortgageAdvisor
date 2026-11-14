import { UsageEventModel, UsageEventType, UsageEvent } from "../models/UsageEvent";

type UsageMeta = Pick<UsageEvent, "provider" | "model" | "usedFallback" | "latencyMs">;

// Fire-and-forget usage logging. Metadata only (see UsageEvent). Never await
// this in a request path and never let it throw: a failed metric write must
// not break a chat reply or an upload. Callers may `void recordUsage(...)`.
export async function recordUsage(
  userId: string,
  type: UsageEventType,
  meta: UsageMeta = {}
): Promise<void> {
  if (!userId) return;
  try {
    await UsageEventModel.create({ userId, type, ...meta });
  } catch (err) {
    // Swallow: logging is best-effort and must not surface to the user.
    console.warn("[usage] failed to record event:", err instanceof Error ? err.message : err);
  }
}
