import { Router, Request, Response } from "express";
import * as db from "../services/dbService";
import { routeToLLM } from "../services/llm/router";
import { ClientData } from "../services/llm/types";
import { ChatMessage, Client } from "../types";

const router = Router();

// Rolling chat window: only the latest N messages are sent to the LLM to keep
// token usage and input costs stable. This trims the in-memory payload only —
// the full history is never persisted server-side, so nothing is lost.
const CHAT_HISTORY_LIMIT = 15;

// Aggregate one or more clients (profile + successfully-extracted documents)
// into a single static ClientData blob. Failed extractions ({ error }) are
// skipped. Passing all clients powers the global chat; a single client scopes
// the conversation to that client.
function buildClientData(clients: Client[]): ClientData {
  const structuredFields: Record<string, unknown> = {};
  const rawTextParts: string[] = [];

  for (const client of clients) {
    const documents: Record<string, unknown> = {};
    for (const doc of client.documents) {
      const data = doc.extractedData;
      if (!data || "error" in data) continue;
      if (data.structuredFields) {
        documents[`${doc.type}:${doc.filename}`] = data.structuredFields;
      }
      if (data.rawText) {
        rawTextParts.push(
          `# לקוח: ${client.name} — מסמך: ${doc.type} (${doc.filename})\n${data.rawText}`
        );
      }
    }

    structuredFields[`${client.name} [${client.id}]`] = {
      profile: {
        name: client.name,
        phone: client.phone,
        email: client.email,
        notes: client.notes,
      },
      documents,
    };
  }

  return {
    structuredFields,
    rawText: rawTextParts.length ? rawTextParts.join("\n\n") : null,
  };
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== "object" || value === null) return false;
  const m = value as Record<string, unknown>;
  return (m.role === "user" || m.role === "assistant") && typeof m.content === "string";
}

router.post("/", async (req: Request, res: Response) => {
  const { clientId, message, chatHistory } = req.body as {
    clientId?: string;
    message?: string;
    chatHistory?: unknown;
  };

  if (!message) return res.status(400).json({ error: "message is required" });

  // Optional clientId scopes the chat to one client; otherwise query all clients.
  let clients: Client[];
  if (clientId) {
    const client = db.getClientById(clientId);
    if (!client) return res.status(404).json({ error: "Client not found" });
    clients = [client];
  } else {
    clients = db.getAllClients();
  }

  const history: ChatMessage[] = Array.isArray(chatHistory)
    ? chatHistory.filter(isChatMessage)
    : [];

  // Rolling window: dispatch only the latest CHAT_HISTORY_LIMIT messages.
  // slice(-N) is safe for short/empty histories (returns the whole array).
  const windowedHistory = history.slice(-CHAT_HISTORY_LIMIT);

  try {
    const { content } = await routeToLLM("CHAT", {
      clientData: buildClientData(clients),
      chatHistory: windowedHistory,
      userMessage: message,
    });

    const reply: ChatMessage = { role: "assistant", content };
    res.json(reply);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error("[chat] LLM request failed:", reason);
    res.status(502).json({ error: "Chat request failed" });
  }
});

// Clear Chat / New Topic: start a fresh conversation for the given scope.
// The backend holds no per-client chat state (history lives in the request
// payload), so "resetting" means handing the client a clean, empty history to
// continue with. Static client data (extractedData) is never touched here, so
// it stays intact as the baseline context — letting prompt caching kick in
// fresh against an empty history. Older messages, if logged elsewhere, are
// untouched: this is a non-destructive acknowledgment, not a deletion.
router.post("/reset", (req: Request, res: Response) => {
  const { clientId } = req.body as { clientId?: string };

  let scopedClient: Client | undefined;
  if (clientId) {
    scopedClient = db.getClientById(clientId);
    if (!scopedClient) return res.status(404).json({ error: "Client not found" });
  }

  const greeting = scopedClient
    ? `שלום! אני שרה. אני כעת מתמקדת בלקוח ${scopedClient.name}. במה אוכל לעזור?`
    : "שלום! אני שרה, עוזרת יועץ המשכנתאות שלך. במה אוכל לעזור?";

  console.log(`[chat] session reset for scope: ${clientId ?? "global"}`);

  res.json({ greeting });
});

export default router;
