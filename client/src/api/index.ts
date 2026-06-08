const BASE = "/api";

export type ChatMessage = { role: "user" | "assistant"; content: string };

// Wraps fetch to inject the Bearer token and auto-logout on auth failure.
// On 401/403 it clears the session and signals the app to return to login.
export async function authFetch(input: string, init: RequestInit = {}) {
  const token = localStorage.getItem("user_token");
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(input, { ...init, headers });
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem("user_token");
    localStorage.removeItem("username");
    window.dispatchEvent(new Event("auth:logout"));
    throw new Error("Unauthorized");
  }
  return res;
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
  if (!res.ok) throw new Error("Chat request failed");
  return res.json() as Promise<ChatMessage>;
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

// Retry extraction for an already-uploaded document. Returns the updated client.
export async function reExtractDocument(clientId: string, docId: string) {
  const res = await authFetch(`${BASE}/upload/${clientId}/${docId}/re-extract`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Re-extract failed");
  return res.json();
}

export async function createClient(data: { name: string; phone: string; email?: string; notes?: string }) {
  const res = await authFetch(`${BASE}/clients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create client");
  return res.json();
}
