import { useState, useRef, useEffect } from "react";
import { sendChatMessage } from "../api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-0.5">
      {[0, 150, 300].map((delay, i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-muted-foreground/50"
          style={{ animation: `typing-bounce 1.2s ease ${delay}ms infinite` }}
        />
      ))}
    </div>
  );
}

function SaraAvatar() {
  return (
    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-800 flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-sm">
      ש
    </div>
  );
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
    <div className="flex flex-col flex-1 overflow-hidden bg-gradient-to-b from-background via-secondary/30 to-background">
      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex flex-col gap-1.5 max-w-[76%]",
              msg.role === "user" ? "self-end items-end" : "self-start items-start"
            )}
          >
            <div className="flex items-center gap-1.5">
              {msg.role === "assistant" && <SaraAvatar />}
              <span className="text-[11px] text-muted-foreground font-medium tracking-wide">
                {msg.role === "assistant" ? "שרה" : "אתה"}
              </span>
              {msg.role === "user" && (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-sm">
                  א
                </div>
              )}
            </div>
            <div
              className={cn(
                "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-gradient-to-br from-indigo-600 to-indigo-900 text-white shadow-md shadow-indigo-900/20"
                  : "bg-white border border-border/70 text-foreground shadow-sm"
              )}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex flex-col gap-1.5 self-start items-start max-w-[76%]">
            <div className="flex items-center gap-1.5">
              <SaraAvatar />
              <span className="text-[11px] text-muted-foreground font-medium tracking-wide">שרה</span>
            </div>
            <div className="bg-white border border-border/70 rounded-2xl px-4 py-3 shadow-sm">
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border/50 px-4 py-3 bg-white/80 backdrop-blur-sm flex gap-2.5 items-end flex-shrink-0">
        <Textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="שאל את שרה..."
          disabled={loading}
          className="resize-none min-h-[40px] max-h-[120px] flex-1 bg-secondary/50 border-border/60 focus-visible:ring-1 rounded-xl text-sm"
        />
        <Button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          size="icon"
          className="h-10 w-10 rounded-xl flex-shrink-0 bg-gradient-to-br from-indigo-600 to-indigo-900 hover:from-indigo-700 hover:to-indigo-950 shadow-md disabled:opacity-40"
        >
          <SendHorizontal className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
