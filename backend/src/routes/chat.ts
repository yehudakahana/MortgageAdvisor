import { Router, Request, Response } from "express";
import { ClientModel } from "../models/Client";
import { routeToLLM } from "../services/llm/router";
import { ClientData } from "../services/llm/types";
import { ChatMessage, Client } from "../types";
import { isNonEmptyString, isOptionalString } from "../validation/validators";

const router = Router();

// Rolling chat window: only the latest N messages are sent to the LLM to keep
// token usage and input costs stable. This trims the in-memory payload only —
// the full history is never persisted server-side, so nothing is lost.
const CHAT_HISTORY_LIMIT = 15;

// Token-cost control: cap the raw document text sent to the LLM, both per
// document and across the whole aggregated payload.
const MAX_RAW_TEXT_CHARS_PER_DOC = 8000;
const MAX_TOTAL_RAW_TEXT_CHARS = 60000;
const TRUNCATION_MARKER = "…[קטוע]";

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max) + TRUNCATION_MARKER;
}

// Aggregate one or more clients (profile + successfully-extracted documents)
// into a single static ClientData blob. Failed extractions ({ error }) are
// skipped. Passing all clients powers the global chat; a single client scopes
// the conversation to that client.
function buildClientData(clients: Client[]): ClientData {
  const structuredFields: Record<string, unknown> = {};
  const rawTextParts: string[] = [];
  let totalRawChars = 0;

  for (const client of clients) {
    const documents: Record<string, unknown> = {};
    for (const doc of client.documents) {
      const data = doc.extractedData;
      if (!data || "error" in data) continue;
      if (data.structuredFields) {
        documents[`${doc.type}:${doc.filename}`] = data.structuredFields;
      }
      if (data.rawText && totalRawChars < MAX_TOTAL_RAW_TEXT_CHARS) {
        const header = `# לקוח: ${client.name} — מסמך: ${doc.type} (${doc.filename})`;
        const body = truncate(data.rawText, MAX_RAW_TEXT_CHARS_PER_DOC);
        const part = truncate(`${header}\n${body}`, MAX_TOTAL_RAW_TEXT_CHARS - totalRawChars);
        rawTextParts.push(part);
        totalRawChars += part.length;
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
  const { clientId, message, chatHistory } = (req.body ?? {}) as Record<string, unknown>;

  if (!isNonEmptyString(message)) return res.status(400).json({ error: "חסרה הודעה" });
  if (!isOptionalString(clientId)) return res.status(400).json({ error: "מזהה הלקוח אינו תקין" });

  // Optional clientId scopes the chat to one client; otherwise query all clients.
  let clients: Client[];
  try {
    if (clientId) {
      const client = await ClientModel.findOne({ id: clientId });
      if (!client) return res.status(404).json({ error: "הלקוח לא נמצא" });
      clients = [client];
    } else {
      clients = await ClientModel.find();
    }
  } catch (err) {
    console.error("[chat] failed to load clients:", err);
    return res.status(500).json({ error: "טעינת נתוני הלקוח נכשלה" });
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
    });

    // `llm` tells the client which model actually answered (fallbacks included).
    res.json({ role: "assistant", content, llm: { provider, model, usedFallback } });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error("[chat] LLM request failed:", reason);
    res.status(502).json({ error: "בקשת הצ'אט נכשלה" });
  }
});

// Clear Chat / New Topic: the backend holds no per-client chat state (history
// lives in the request payload), so "resetting" means handing the client a
// clean, empty history to continue with. Static client data (extractedData) is
// never touched here — a non-destructive acknowledgment, not a deletion.
router.post("/reset", async (req: Request, res: Response) => {
  const { clientId } = (req.body ?? {}) as Record<string, unknown>;
  if (!isOptionalString(clientId)) return res.status(400).json({ error: "מזהה הלקוח אינו תקין" });

  let scopedClient: Client | null = null;
  if (clientId) {
    try {
      scopedClient = await ClientModel.findOne({ id: clientId });
    } catch (err) {
      console.error("[chat] reset failed to load client:", err);
      return res.status(500).json({ error: "טעינת נתוני הלקוח נכשלה" });
    }
    if (!scopedClient) return res.status(404).json({ error: "הלקוח לא נמצא" });
  }

  const greeting = scopedClient
    ? `שלום! אני קאיה. אני כעת מתמקדת בלקוח ${scopedClient.name}. במה אוכל לעזור?`
    : "שלום! אני קאיה, עוזרת יועץ המשכנתאות שלך. במה אוכל לעזור?";

  console.log(`[chat] session reset for scope: ${clientId ?? "global"}`);

  res.json({ greeting });
});

export default router;
