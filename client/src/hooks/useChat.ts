import { useState, useRef, useEffect } from "react";
import { sendChatMessage, getClients, type ChatMessage } from "../api";
import type { Client } from "../types/client";

function greeting(client?: Client): ChatMessage {
  const content = client
    ? `שלום! אני שרה. אני כעת מתמקדת בלקוח ${client.name}. במה אוכל לעזור?`
    : "שלום! אני שרה, עוזרת יועץ המשכנתאות שלך. במה אוכל לעזור?";
  return { role: "assistant", content };
}

export function useChat() {
  const [clients, setClients] = useState<Client[]>([]);
  const [scopeId, setScopeId] = useState(""); // "" = all clients (global chat)
  const [messages, setMessages] = useState<ChatMessage[]>([greeting()]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getClients()
      .then((data: Client[]) => setClients(data))
      .catch(() => setClients([]));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Switching scope starts a fresh conversation so contexts don't mix.
  function changeScope(id: string) {
    setScopeId(id);
    setMessages([greeting(clients.find((c) => c.id === id))]);
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);
    try {
      // History must start with a user turn — drop the seeded assistant greeting.
      let start = 0;
      while (start < messages.length && messages[start].role === "assistant") start++;
      const history = messages.slice(start);
      const reply = await sendChatMessage(text, history, scopeId || undefined);
      setMessages((prev) => [...prev, reply]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "משהו השתבש. אנא נסה שוב." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return {
    clients, scopeId, changeScope,
    messages, input, setInput, loading, send, bottomRef,
  };
}
