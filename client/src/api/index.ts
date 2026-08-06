// In dev, VITE_API_URL is empty so requests stay relative and hit the Vite
// proxy. In production (Cloudflare Pages) set it to the Railway backend origin.
// Trailing slashes are stripped so a value like "https://host/" doesn't
// produce "//api/..." URLs, which Express rejects with a 404.
import { toast } from "@/lib/toast";
import { GUEST_TEXT } from "@/lib/strings";

export const BASE = `${(import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "")}/api`;

// Which LLM actually produced a reply/extraction (fallbacks included) — sent
// by the backend so the UI can show the model in use.
export type LLMSource = { provider: string; model: string; usedFallback?: boolean };

export type ChatMessage = { role: "user" | "assistant"; content: string; llm?: LLMSource };

// Chat replies carry the guest's remaining hourly quota (absent for regular users).
export type ChatReply = ChatMessage & { remainingMessages?: number };

// Builds an Error carrying the server's Hebrew message (when present) and the
// HTTP status, so callers can show the real reason (guest caps, quotas).
async function apiError(res: Response, fallback: string): Promise<Error> {
  let message = fallback;
  try {
    const body = await res.json();
    if (typeof body?.error === "string" && body.error) message = body.error;
  } catch {
    // non-JSON body (proxy/HTML error page) — keep the fallback
  }
  return Object.assign(new Error(message), { status: res.status });
}

// Wraps fetch to inject the Bearer token and auto-logout on auth failure.
// Only 401 clears the session — 403 now means a guest-mode cap, which the
// caller shows in place. Guests get an expiry toast (cleaned-up account).
export async function authFetch(input: string, init: RequestInit = {}) {
  const token = localStorage.getItem("user_token");
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(input, { ...init, headers });
  if (res.status === 401) {
    const wasGuest = localStorage.getItem("is_guest") === "1";
    localStorage.removeItem("user_token");
    localStorage.removeItem("username");
    localStorage.removeItem("is_guest");
    if (wasGuest) toast(GUEST_TEXT.sessionExpired);
    window.dispatchEvent(new Event("auth:logout"));
    throw new Error("Unauthorized");
  }
  return res;
}

// Creates a temporary 24h guest account with sample data and returns its JWT.
export async function loginAsGuest() {
  const res = await fetch(`${BASE}/auth/guest`, { method: "POST" });
  if (!res.ok) throw await apiError(res, "Guest login failed");
  return res.json() as Promise<{ token: string; username: string; isGuest: boolean }>;
}

export async function login(username: string, password: string) {
  const res = await fetch(`${BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error("Login failed");
  return res.json() as Promise<{ token: string; username: string }>;
}

// clientId is optional: omit it for global chat (queries all clients).
export async function sendChatMessage(
  message: string,
  chatHistory: ChatMessage[] = [],
  clientId?: string
) {
  const res = await authFetch(`${BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, chatHistory, clientId }),
  });
  // Carry the server's Hebrew message + status so the chat UI can show guest
  // quota errors (429/400) verbatim.
  if (!res.ok) throw await apiError(res, "Chat request failed");
  return res.json() as Promise<ChatReply>;
}

// Clear Chat / New Topic: tell the backend to start a fresh session for the
// given scope. Returns an empty history plus the scoped greeting to render.
export async function resetChat(clientId?: string) {
  const res = await authFetch(`${BASE}/chat/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId }),
  });
  if (!res.ok) throw new Error("Chat reset failed");
  return res.json() as Promise<{ greeting: string }>;
}

export async function getClients() {
  const res = await authFetch(`${BASE}/clients`);
  if (!res.ok) throw new Error("Failed to fetch clients");
  return res.json();
}

export async function getClient(id: string) {
  const res = await authFetch(`${BASE}/clients/${id}`);
  if (!res.ok) throw new Error("Failed to fetch client");
  return res.json();
}

// Upload a document for a client. Routes through BASE so it reaches the backend
// in production (a relative /api path would hit the static site and 405).
// On failure, throws with the server's error message (Hebrew, from
// UPLOAD_MESSAGES) so the UI can show the real reason per file.
export async function uploadDocument(clientId: string, form: FormData) {
  const res = await authFetch(`${BASE}/upload/${clientId}`, { method: "POST", body: form });
  if (!res.ok) {
    let message = "";
    try {
      const body = await res.json();
      if (typeof body?.error === "string") message = body.error;
    } catch {
      // non-JSON body (proxy/HTML error page) — leave message empty
    }
    throw new Error(message);
  }
  return res.json();
}

// Fetch a short-lived presigned URL for a document. mode "view" previews inline
// (PDF/image); "download" forces an attachment with the original filename.
export async function getDocumentUrl(
  clientId: string,
  docId: string,
  mode: "view" | "download" = "view"
) {
  const query = mode === "download" ? "?mode=download" : "";
  const res = await authFetch(`${BASE}/upload/${clientId}/${docId}/view${query}`);
  if (!res.ok) throw new Error("Failed to get document URL");
  return res.json() as Promise<{ url: string }>;
}

// Retry extraction for an already-uploaded document. Returns the updated client.
export async function reExtractDocument(clientId: string, docId: string) {
  const res = await authFetch(`${BASE}/upload/${clientId}/${docId}/re-extract`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Re-extract failed");
  return res.json();
}

// Delete a client; the backend also removes their stored files from R2.
export async function deleteClient(id: string) {
  const res = await authFetch(`${BASE}/clients/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete client");
  return res.json();
}

// Delete a single document (stored file + metadata). Returns the updated client.
export async function deleteDocument(clientId: string, docId: string) {
  const res = await authFetch(`${BASE}/upload/${clientId}/${docId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete document");
  return res.json();
}

export async function createClient(data: { name: string; phone: string; email?: string }) {
  const res = await authFetch(`${BASE}/clients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  // Server message matters here: guest client-cap 403s carry Hebrew text.
  if (!res.ok) throw await apiError(res, "Failed to create client");
  return res.json();
}
