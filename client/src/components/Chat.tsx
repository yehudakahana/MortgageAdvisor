import { useState, useRef, useEffect } from "react";
import { sendChatMessage } from "../api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "שלום! אני שרה, עוזרת יועץ המשכנתאות שלך. במה אוכל לעזור?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);
    try {
      const reply = await sendChatMessage(text);
      setMessages((prev) => [...prev, { role: "assistant", content: reply.content }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "משהו השתבש. אנא נסה שוב." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`bubble ${msg.role}`}>
            <span className="label">{msg.role === "assistant" ? "שרה" : "אתה"}</span>
            <p>{msg.content}</p>
          </div>
        ))}
        {loading && (
          <div className="bubble assistant">
            <span className="label">שרה</span>
            <p className="typing">...</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="input-bar">
        <textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="הקלד הודעה..."
          disabled={loading}
        />
        <button onClick={handleSend} disabled={loading || !input.trim()}>
          שלח
        </button>
      </div>
    </div>
  );
}
