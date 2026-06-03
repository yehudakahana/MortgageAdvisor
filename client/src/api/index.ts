const BASE = "/api";

export type ChatMessage = { role: "user" | "assistant"; content: string };

// clientId is optional: omit it for global chat (queries all clients).
export async function sendChatMessage(
  message: string,
  chatHistory: ChatMessage[] = [],
  clientId?: string
) {
  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, chatHistory, clientId }),
  });
  if (!res.ok) throw new Error("Chat request failed");
  return res.json() as Promise<ChatMessage>;
}

export async function getClients() {
  const res = await fetch(`${BASE}/clients`);
  if (!res.ok) throw new Error("Failed to fetch clients");
  return res.json();
}

export async function createClient(data: { name: string; phone: string; email?: string; notes?: string }) {
  const res = await fetch(`${BASE}/clients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create client");
  return res.json();
}
