import { useState, useRef, useEffect } from "react";
import { sendChatMessage, resetChat, type ChatMessage } from "../api";
import { useClients } from "../context/ClientsContext";

// Shown only when fetching the server greeting fails. Intentionally name-free:
// the assistant's name and greeting text live in one place — the backend
// /api/chat/reset endpoint.
const FALLBACK_GREETING: ChatMessage = {
  role: "assistant",
  content: "שלום! במה אוכל לעזור?",
};

export function useChat() {
  const { clients } = useClients();
  const [scopeId, setScopeId] = useState(""); // "" = all clients (global chat)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  // Committed history sent to the LLM: only successful user→assistant pairs.
  // Kept separate from `messages` so the greeting and failed turns (optimistic
  // user message + error bubble) never leak into the model's context.
  const historyRef = useRef<ChatMessage[]>([]);
  // Guards against out-of-order /reset responses when the scope changes while
  // a previous reset is still in flight.
  const resetSeqRef = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Start a fresh conversation for the given scope. The greeting is fetched
  // from the backend (single source of truth); `loading` blocks sends until it
  // arrives, and the generic fallback covers server failures.
  async function startFresh(id: string) {
    const seq = ++resetSeqRef.current;
    setLoading(true);
    historyRef.current = [];
    setMessages([]);
    try {
      const { greeting } = await resetChat(id || undefined);
      if (seq !== resetSeqRef.current) return;
      setMessages([{ role: "assistant", content: greeting }]);
    } catch {
      if (seq !== resetSeqRef.current) return;
      setMessages([FALLBACK_GREETING]);
    } finally {
      if (seq === resetSeqRef.current) setLoading(false);
    }
  }

  // Initial greeting on mount (global scope).
  useEffect(() => {
    startFresh("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switching scope starts a fresh conversation so contexts don't mix.
  function changeScope(id: string) {
    setScopeId(id);
    startFresh(id);
  }

  // Clear Chat / New Topic: drop the local history and start fresh.
  async function clearChat() {
    if (loading) return;
    await startFresh(scopeId);
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
    } catch (err) {
      // fetch rejects with TypeError on network failure; the API client throws
      // a plain Error when the server responded with a non-OK status.
      const content =
        err instanceof TypeError
          ? "בעיה בחיבור לשרת. בדקו את החיבור ונסו שוב."
          : "קאיה לא הצליחה לענות כרגע. נסו שוב בעוד רגע.";
      setMessages((prev) => [...prev, { role: "assistant", content }]);
    } finally {
      setLoading(false);
    }
  }

  return {
    clients, scopeId, changeScope,
    messages, input, setInput, loading, send, clearChat, bottomRef,
  };
}
