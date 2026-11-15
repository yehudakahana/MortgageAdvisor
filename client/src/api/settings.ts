import { authFetch, BASE } from "./index";

// Client-side mirror of the server limits in backend/src/routes/settings.ts —
// keep in sync.
export const MAX_RULE_LENGTH = 200;
export const MAX_RULES = 25;

// Rule scope. "chat" shapes chat answers; "document_validation" is checked
// against a client's uploaded documents. Mirrors the backend RuleCategory.
export type RuleCategory = "chat" | "document_validation";

// A custom advisor rule as returned by /api/settings/knowledge.
export interface KnowledgeRule {
  id: string;
  text: string;
  category?: RuleCategory;
  createdAt: string;
  updatedAt?: string;
}

const JSON_HEADERS = { "Content-Type": "application/json" };

// Throws with the server's Hebrew error message (empty when unavailable) so
// callers can toast the real reason with a generic fallback.
async function toError(res: Response): Promise<Error> {
  let message = "";
  try {
    const body = await res.json();
    if (typeof body?.error === "string") message = body.error;
  } catch {
    // non-JSON body (proxy/HTML error page) — leave message empty
  }
  return new Error(message);
}

export async function getKnowledgeRules(category?: RuleCategory): Promise<KnowledgeRule[]> {
  const query = category ? `?category=${category}` : "";
  const res = await authFetch(`${BASE}/settings/knowledge${query}`);
  if (!res.ok) throw await toError(res);
  return res.json();
}

export async function addKnowledgeRule(
  text: string,
  category: RuleCategory = "chat"
): Promise<KnowledgeRule> {
  const res = await authFetch(`${BASE}/settings/knowledge`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ text, category }),
  });
  if (!res.ok) throw await toError(res);
  return res.json();
}

export async function updateKnowledgeRule(id: string, text: string): Promise<KnowledgeRule> {
  const res = await authFetch(`${BASE}/settings/knowledge/${id}`, {
    method: "PUT",
    headers: JSON_HEADERS,
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw await toError(res);
  return res.json();
}

export async function deleteKnowledgeRule(id: string): Promise<void> {
  const res = await authFetch(`${BASE}/settings/knowledge/${id}`, { method: "DELETE" });
  if (!res.ok) throw await toError(res);
}
