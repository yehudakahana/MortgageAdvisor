import { useState, useRef, useEffect } from "react";
import { sendChatMessage, resetChat, getClients, type ChatMessage } from "../api";
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
  // Committed history sent to the LLM: only successful user→assistant pairs.
  // Kept separate from `messages` so the greeting and failed turns (optimistic
  // user message + error bubble) never leak into the model's context.
  const historyRef = useRef<ChatMessage[]>([]);

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
    historyRef.current = [];
    setMessages([greeting(clients.find((c) => c.id === id))]);
  }

  // Clear Chat / New Topic: drop the local history and start fresh. Asks the
  // backend to reset the session (and supply the greeting); falls back to the
  // local greeting if the request fails so the UI always clears.
  async function clearChat() {
    if (loading) return;
    const fallback = greeting(clients.find((c) => c.id === scopeId));
    historyRef.current = [];
    try {
      const { greeting: serverGreeting } = await resetChat(scopeId || undefined);
      setMessages([{ role: "assistant", content: serverGreeting }]);
    } catch {
      setMessages([fallback]);
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const userMessage: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    try {
      const reply = await sendChatMessage(text, historyRef.current, scopeId || undefined);
      // Commit the exchange only after a successful round trip.
      historyRef.current = [...historyRef.current, userMessage, reply];
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
    messages, input, setInput, loading, send, clearChat, bottomRef,
  };
}
