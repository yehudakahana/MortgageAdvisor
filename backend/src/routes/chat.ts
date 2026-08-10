import { Router, Request, Response } from "express";
import { ClientModel } from "../models/Client";
import { routeToLLM } from "../services/llm/router";
import { buildClientData, loadAdvisorRules } from "../services/chatContext";
import { guestChatCap, guestPromptCap } from "../middleware/guestLimits";
import { GUEST_LIMITS } from "../constants/guest";
import { ChatMessage, Client } from "../types";
import { isNonEmptyString, isOptionalString } from "../validation/validators";
import { CHAT_MESSAGES, CLIENT_MESSAGES } from "../constants/messages";

const router = Router();

// Rolling chat window: only the latest N messages are sent to the LLM to keep
// token usage and input costs stable. This trims the in-memory payload only —
// the full history is never persisted server-side, so nothing is lost.
const CHAT_HISTORY_LIMIT = 15;

function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== "object" || value === null) return false;
  const m = value as Record<string, unknown>;
  return (m.role === "user" || m.role === "assistant") && typeof m.content === "string";
}

// guestPromptCap (250 chars) runs first so an over-long prompt is rejected
// without spending one of the guest's 10 hourly messages. Both are no-ops for
// regular users.
router.post("/", guestPromptCap, guestChatCap, async (req: Request, res: Response) => {
  const { clientId, message, chatHistory } = (req.body ?? {}) as Record<string, unknown>;

  if (!isNonEmptyString(message)) return res.status(400).json({ error: CHAT_MESSAGES.missingMessage });
  if (!isOptionalString(clientId)) return res.status(400).json({ error: CHAT_MESSAGES.invalidClientId });

  const userId = req.user?.id ?? "";

  // Optional clientId scopes the chat to one client; otherwise query all of
  // THIS USER's clients. Everything is tenant-scoped by userId.
  let clients: Client[];
  try {
    if (clientId) {
      const client = await ClientModel.findOne({ id: clientId, userId });
      if (!client) return res.status(404).json({ error: CLIENT_MESSAGES.notFound });
      clients = [client];
    } else {
      clients = await ClientModel.find({ userId });
    }
  } catch (err) {
    console.error("[chat] failed to load clients:", err);
    return res.status(500).json({ error: CLIENT_MESSAGES.fetchFailed });
  }

  const history: ChatMessage[] = Array.isArray(chatHistory)
    ? chatHistory.filter(isChatMessage)
    : [];

  // Rolling window: dispatch only the latest CHAT_HISTORY_LIMIT messages.
  // slice(-N) is safe for short/empty histories (returns the whole array).
  const windowedHistory = history.slice(-CHAT_HISTORY_LIMIT);

  try {
    const { content, provider, model, usedFallback } = await routeToLLM("CHAT", {
      clientData: buildClientData(clients),
      chatHistory: windowedHistory,
      userMessage: message,
      advisorRules: await loadAdvisorRules(req.user?.username),
      // Output cap for guests — keeps demo replies (and cost) small.
      maxTokens: req.user?.isGuest ? GUEST_LIMITS.maxTokens : undefined,
    });

    // `llm` tells the client which model actually answered (fallbacks included).
    // Guests also get their remaining hourly quota (set by guestChatCap) —
    // the frontend badge's single source of truth.
    res.json({
      role: "assistant",
      content,
      llm: { provider, model, usedFallback },
      ...(req.user?.isGuest ? { remainingMessages: req.guestRemaining ?? 0 } : {}),
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error("[chat] LLM request failed:", reason);
    res.status(502).json({ error: CHAT_MESSAGES.requestFailed });
  }
});

// Clear Chat / New Topic: the backend holds no per-client chat state (history
// lives in the request payload), so "resetting" means handing the client a
// clean, empty history to continue with. Static client data (extractedData) is
// never touched here — a non-destructive acknowledgment, not a deletion.
router.post("/reset", async (req: Request, res: Response) => {
  const { clientId } = (req.body ?? {}) as Record<string, unknown>;
  if (!isOptionalString(clientId)) return res.status(400).json({ error: CHAT_MESSAGES.invalidClientId });

  let scopedClient: Client | null = null;
  if (clientId) {
    try {
      scopedClient = await ClientModel.findOne({ id: clientId, userId: req.user?.id ?? "" });
    } catch (err) {
      console.error("[chat] reset failed to load client:", err);
      return res.status(500).json({ error: CLIENT_MESSAGES.fetchFailed });
    }
    if (!scopedClient) return res.status(404).json({ error: CLIENT_MESSAGES.notFound });
  }

  const greeting = scopedClient
    ? CHAT_MESSAGES.greetingScoped(scopedClient.name)
    : CHAT_MESSAGES.greetingGlobal;

  console.log(`[chat] session reset for scope: ${clientId ?? "global"}`);

  res.json({ greeting });
});

export default router;
