import { Request, Response, NextFunction } from "express";
import rateLimit, { RateLimitInfo } from "express-rate-limit";
import { ClientModel } from "../models/Client";
import { GUEST_LIMITS, SAMPLE_KEY_PREFIX } from "../constants/guest";
import { GUEST_MESSAGES } from "../constants/messages";

// express-rate-limit sets req.rateLimit but doesn't augment Express' Request
// type itself — declared here so the chat route can echo `remaining`.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      rateLimit?: RateLimitInfo;
    }
  }
}

// All middleware here is a no-op for regular users — guests only.

// Chat message cap: 10 LLM calls per hour PER GUEST (not per IP — several
// guests can share a NAT, and one guest could rotate IPs). In-memory store,
// resets on redeploy — acceptable for MVP. req.rateLimit.remaining is echoed
// back in every chat response as the frontend badge's source of truth.
export const guestChatLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: GUEST_LIMITS.chatPerHour,
  keyGenerator: (req) => req.user?.id ?? "anonymous",
  skip: (req) => !req.user?.isGuest,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: GUEST_MESSAGES.chatCapReached },
});

// Input cap: keep guest prompts (and therefore input tokens) small.
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

// Creation cap: the sample clone + up to `extraClients` self-created clients.
export async function guestClientCap(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user?.isGuest) return next();
  try {
    const count = await ClientModel.countDocuments({ userId: req.user.id });
    if (count >= 1 + GUEST_LIMITS.extraClients) {
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
