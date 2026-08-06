import { useState, useRef, useEffect } from "react";
import { sendChatMessage, resetChat, type ChatMessage } from "../api";
import { useClients } from "../context/ClientsContext";
import { useGuestMode } from "../context/GuestModeContext";
import { CHAT_TEXT } from "@/lib/strings";
import { toast } from "@/lib/toast";

// Shown only when fetching the server greeting fails. Intentionally name-free:
// the assistant's name and greeting text live in one place — the backend
// /api/chat/reset endpoint.
const FALLBACK_GREETING: ChatMessage = {
  role: "assistant",
  content: CHAT_TEXT.fallbackGreeting,
};

export function useChat() {
  const { clients, isLoading: clientsLoading } = useClients();
  const { setRemainingMessages } = useGuestMode();
  const [scopeId, setScopeId] = useState(""); // "" = all clients (global chat)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  // Starts true so sends stay blocked until the initial scope is resolved and
  // its greeting arrives (startFresh clears it).
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  // Committed history sent to the LLM: only successful user→assistant pairs.
  // Kept separate from `messages` so the greeting and failed turns (optimistic
  // user message + error bubble) never leak into the model's context.
  const historyRef = useRef<ChatMessage[]>([]);
  // Guards against out-of-order /reset responses when the scope changes while
  // a previous reset is still in flight.
  const resetSeqRef = useRef(0);
  const initializedRef = useRef(false);

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

  // Initial scope: once the clients list finishes loading, default to the
  // first client; fall back to global chat when the list is empty (or failed
  // to load).
  useEffect(() => {
    if (initializedRef.current || clientsLoading) return;
    initializedRef.current = true;
    const firstId = clients[0]?.id ?? "";
    setScopeId(firstId);
    startFresh(firstId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientsLoading, clients]);

  // If the scoped client disappears from the list (e.g. deleted in the panel),
  // fall back to global chat so sends don't target a nonexistent client.
  useEffect(() => {
    if (!initializedRef.current || clientsLoading) return;
    if (scopeId && !clients.some((c) => c.id === scopeId)) {
      setScopeId("");
      startFresh("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, clientsLoading, scopeId]);

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
      // Guest quota: the backend reports the remaining hourly messages on
      // every reply — feed the header badge.
      if (typeof reply.remainingMessages === "number") {
        setRemainingMessages(reply.remainingMessages);
      }
      // Commit the exchange only after a successful round trip.
      historyRef.current = [...historyRef.current, userMessage, reply];
      setMessages((prev) => [...prev, reply]);
    } catch (err) {
      // fetch rejects with TypeError on network failure; the API client throws
      // an Error carrying the server's Hebrew message + HTTP status otherwise.
      const status = (err as { status?: number }).status;
      let content =
        err instanceof TypeError ? CHAT_TEXT.networkError : CHAT_TEXT.replyError;
      // Guest caps (quota 429 / prompt length 400): show the server's own
      // Hebrew explanation instead of a generic failure.
      if ((status === 429 || status === 400) && err instanceof Error && err.message) {
        content = err.message;
        if (status === 429) {
          setRemainingMessages(0);
          toast(content);
        }
      }
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
