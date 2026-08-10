import { Request, Response, NextFunction } from "express";
import { ClientModel } from "../models/Client";
import { consumeGuestQuota, GuestQuotaName } from "../services/guestQuotaService";
import { GUEST_LIMITS, SAMPLE_KEY_PREFIX } from "../constants/guest";
import { GUEST_MESSAGES } from "../constants/messages";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      // Units left in the guest's hourly chat quota after this request, set by
      // consumeQuota and echoed back so the frontend badge stays honest.
      guestRemaining?: number;
    }
  }
}

// All middleware here is a no-op for regular users — guests only.

// Spends one unit of a persisted hourly quota, or rejects with `message` —
// which is built from the minutes left in the window, so the guest is told
// when the next batch opens. Persisted (not in-memory) so the limit cannot be
// reset by signing out and re-entering guest mode, nor by a redeploy.
function consumeQuota(
  quota: GuestQuotaName,
  max: number,
  message: (resetInMinutes: number) => string
) {
  return async function (req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!req.user?.isGuest) return next();
    try {
      const result = await consumeGuestQuota(req.user.id, quota, max);
      if (!result.allowed) {
        // Retry-After (seconds) for correctness; retryAfterMinutes so the UI
        // can render a countdown without re-parsing the Hebrew sentence.
        res.set("Retry-After", String(result.resetInMinutes * 60));
        res.status(429).json({
          error: message(result.resetInMinutes),
          retryAfterMinutes: result.resetInMinutes,
        });
        return;
      }
      req.guestRemaining = result.remaining;
      next();
    } catch (err) {
      console.error(`[guest-limits] ${quota} quota check failed:`, err);
      res.status(500).json({ error: GUEST_MESSAGES.creationFailed });
    }
  };
}

// Chat message cap, PER GUEST (not per IP — several guests can share a NAT,
// and one guest could rotate IPs). The window matches the account TTL, so this
// is effectively the account's lifetime message budget.
export const guestChatCap = consumeQuota(
  "chat",
  GUEST_LIMITS.chatPerWindow,
  GUEST_MESSAGES.chatCapReached
);

// Re-extraction runs a full document extraction through the LLM, so it needs
// its own cap — otherwise a guest could replay it on the sample document
// indefinitely and bypass every other spending limit.
export const guestReExtractCap = consumeQuota(
  "reExtract",
  GUEST_LIMITS.reExtractsPerWindow,
  GUEST_MESSAGES.reExtractCapReached
);

// Input cap: keep guest prompts (and therefore input tokens) small. Runs
// before the chat quota so a rejected prompt doesn't spend a message.
export function guestPromptCap(req: Request, res: Response, next: NextFunction): void {
  const { message } = (req.body ?? {}) as Record<string, unknown>;
  if (
    req.user?.isGuest &&
    typeof message === "string" &&
    message.length > GUEST_LIMITS.promptChars
  ) {
    res.status(400).json({ error: GUEST_MESSAGES.promptTooLong });
    return;
  }
  next();
}

// Creation cap: `extraClients` clients of the guest's own. The cloned sample
// client carries isSample and is excluded, so a guest whose clone is missing
// (no template seeded) still gets exactly the advertised allowance.
export async function guestClientCap(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user?.isGuest) return next();
  try {
    const count = await ClientModel.countDocuments({
      userId: req.user.id,
      isSample: { $ne: true },
    });
    if (count >= GUEST_LIMITS.extraClients) {
      res.status(403).json({ error: GUEST_MESSAGES.clientCapReached });
      return;
    }
    next();
  } catch (err) {
    console.error("[guest-limits] client count failed:", err);
    res.status(500).json({ error: GUEST_MESSAGES.creationFailed });
  }
}

// Upload caps: max file size and max total uploads. Runs AFTER multer so
// req.file.size reflects the real buffer. Cloned sample documents (samples/*
// keys) don't count against the quota — only the guest's own uploads do.
export async function guestUploadCap(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user?.isGuest) return next();
  if (req.file && req.file.size > GUEST_LIMITS.fileSizeBytes) {
    res.status(403).json({ error: GUEST_MESSAGES.fileTooLarge });
    return;
  }
  try {
    const clients = await ClientModel.find({ userId: req.user.id }, { documents: 1 });
    const uploaded = clients
      .flatMap((c) => c.documents)
      .filter((d) => !d.key?.startsWith(SAMPLE_KEY_PREFIX)).length;
    if (uploaded >= GUEST_LIMITS.uploads) {
      res.status(403).json({ error: GUEST_MESSAGES.uploadCapReached });
      return;
    }
    next();
  } catch (err) {
    console.error("[guest-limits] upload count failed:", err);
    res.status(500).json({ error: GUEST_MESSAGES.creationFailed });
  }
}
