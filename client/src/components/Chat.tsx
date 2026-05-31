import { useState, useRef, useEffect } from "react";
import { sendChatMessage } from "../api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

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
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex flex-col max-w-[72%] gap-1",
              msg.role === "user" ? "self-end items-end" : "self-start items-start"
            )}
          >
            <span className="text-xs text-muted-foreground font-semibold px-1 uppercase tracking-wide">
              {msg.role === "assistant" ? "שרה" : "אתה"}
            </span>
            <div
              className={cn(
                "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-card border border-border text-card-foreground rounded-bl-sm shadow-sm"
              )}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex flex-col max-w-[72%] self-start items-start gap-1">
            <span className="text-xs text-muted-foreground font-semibold px-1 uppercase tracking-wide">שרה</span>
            <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm shadow-sm">
              <span className="animate-pulse opacity-60">...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-border p-4 flex gap-2 bg-background flex-shrink-0">
        <Textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="הקלד הודעה..."
          disabled={loading}
          className="resize-none min-h-[40px] max-h-[120px] flex-1"
        />
        <Button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="self-end"
        >
          שלח
        </Button>
      </div>
    </div>
  );
}
