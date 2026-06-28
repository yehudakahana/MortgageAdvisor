import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendHorizontal, MessageSquarePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChat } from "../hooks/useChat";
import ChatScopeSelect from "./ChatScopeSelect";

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

function AssistantAvatar() {
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-800 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
      ש
    </div>
  );
}

export default function Chat() {
  const {
    clients, scopeId, changeScope,
    messages, input, setInput, loading, send, clearChat, bottomRef,
  } = useChat();

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-gradient-to-b from-background via-secondary/30 to-background">
      <ChatScopeSelect clients={clients} value={scopeId} onChange={changeScope} disabled={loading} />

      <div className="flex-1 overflow-y-auto px-5 py-5 max-md:px-3 max-md:py-4 flex flex-col gap-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex flex-col gap-1.5 max-w-[76%] max-md:max-w-[88%]",
              msg.role === "user" ? "self-end items-end" : "self-start items-start"
            )}
          >
            <div className="flex items-center gap-1.5">
              {msg.role === "assistant" && <AssistantAvatar />}
              <span className="text-xs text-muted-foreground font-medium tracking-wide">
                {msg.role === "assistant" ? "שרה" : "אתה"}
              </span>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                  א
                </div>
              )}
            </div>
            <div
              className={cn(
                "rounded-2xl px-5 py-3 max-md:px-4 text-base leading-relaxed break-words whitespace-pre-wrap",
                msg.role === "user"
                  ? "bg-gradient-to-br from-indigo-600 to-indigo-900 text-white shadow-md shadow-indigo-900/20"
                  : "bg-card border border-border/70 text-foreground shadow-sm"
              )}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex flex-col gap-1.5 self-start items-start max-w-[76%] max-md:max-w-[88%]">
            <div className="flex items-center gap-1.5">
              <AssistantAvatar />
              <span className="text-xs text-muted-foreground font-medium tracking-wide">שרה</span>
            </div>
            <div className="bg-card border border-border/70 rounded-2xl px-4 py-3 shadow-sm">
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex justify-start px-4 pt-2 pb-1.5">
        <Button
          onClick={clearChat}
          disabled={loading}
          variant="outline"
          title="שיחה חדשה"
          className="h-10 gap-2 rounded-full border-indigo-200 bg-indigo-50/60 px-5 text-base font-bold text-indigo-700 shadow-sm transition-all hover:border-indigo-300 hover:bg-indigo-100 hover:text-indigo-900 hover:shadow-md disabled:opacity-40"
        >
          <MessageSquarePlus className="h-5 w-5" />
          שיחה חדשה
        </Button>
      </div>

      <div className="border-t border-border/50 px-4 py-3 max-md:pb-[max(env(safe-area-inset-bottom),0.75rem)] bg-card/80 backdrop-blur-sm flex gap-2.5 items-end flex-shrink-0">
        <Textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="שאל את שרה משהו..."
          disabled={loading}
          className="resize-none min-h-[48px] max-h-[120px] flex-1 bg-secondary/50 border-border/60 focus-visible:ring-1 rounded-xl text-base"
        />
        <Button
          onClick={send}
          disabled={loading || !input.trim()}
          size="icon"
          className="h-11 w-11 rounded-xl flex-shrink-0 bg-gradient-to-br from-indigo-600 to-indigo-900 hover:from-indigo-700 hover:to-indigo-950 shadow-md disabled:opacity-40"
        >
          <SendHorizontal className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
