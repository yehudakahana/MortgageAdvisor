import { Router, Request, Response } from "express";
import * as db from "../services/dbService";
import { routeToLLM } from "../services/llm/router";
import { ClientData } from "../services/llm/types";
import { ChatMessage, Client } from "../types";

const router = Router();

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

  try {
    const { content } = await routeToLLM("CHAT", {
      clientData: buildClientData(clients),
      chatHistory: history,
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

export default router;
