import { cn } from "@/lib/utils";
import { CHAT_TEXT } from "@/lib/strings";

const PROVIDER_LABELS: Record<string, string> = { claude: "Claude", gemini: "Gemini" };

export interface LLMSourceInfo {
  provider: string;
  model: string;
  usedFallback?: boolean;
}

// Small caption telling the user which model actually produced a result —
// shown on chat replies and document extractions, fallbacks included.
export default function LLMSourceNote({ source, className }: { source: LLMSourceInfo; className?: string }) {
  return (
    <span className={cn("text-[11px] text-muted-foreground/60 inline-flex items-center gap-1", className)}>
      <span dir="ltr">
        {PROVIDER_LABELS[source.provider] ?? source.provider} · {source.model}
      </span>
      {source.usedFallback && <span className="text-amber-600 font-medium">{CHAT_TEXT.fallbackModelNote}</span>}
    </span>
  );
}
