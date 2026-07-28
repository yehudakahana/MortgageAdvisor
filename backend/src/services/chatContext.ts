import { Client } from "../types";
import { ClientData } from "./llm/types";
import { UserSettingsModel } from "../models/UserSettings";

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
export function buildClientData(clients: Client[]): ClientData {
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

// The advisor's custom knowledge rules for prompt injection. Rules are advisory
// context — a load failure must never break the chat, so this resolves to an
// empty list on any error.
export async function loadAdvisorRules(username: string | undefined): Promise<string[]> {
  if (!username) return [];
  try {
    const settings = await UserSettingsModel.findOne({ username });
    return settings?.customKnowledge.map((rule) => rule.text) ?? [];
  } catch (err) {
    console.warn("[chat] failed to load advisor rules:", err);
    return [];
  }
}
