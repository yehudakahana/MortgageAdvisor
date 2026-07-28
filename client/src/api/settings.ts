import { authFetch, BASE } from "./index";

// Client-side mirror of the server limits in backend/src/routes/settings.ts —
// keep in sync.
export const MAX_RULE_LENGTH = 200;
export const MAX_RULES = 25;

// A custom advisor rule as returned by /api/settings/knowledge.
export interface KnowledgeRule {
  id: string;
  text: string;
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

export async function getKnowledgeRules(): Promise<KnowledgeRule[]> {
  const res = await authFetch(`${BASE}/settings/knowledge`);
  if (!res.ok) throw await toError(res);
  return res.json();
}

export async function addKnowledgeRule(text: string): Promise<KnowledgeRule> {
  const res = await authFetch(`${BASE}/settings/knowledge`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ text }),
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
