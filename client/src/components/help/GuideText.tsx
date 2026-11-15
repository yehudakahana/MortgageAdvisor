import { ArrowRight } from "lucide-react";
import type { Guide } from "@/lib/guides";
import { HELP_TEXT } from "@/lib/strings";

interface GuideTextProps {
  guide: Guide;
  onBack: () => void;
}

// A text-only guide (no screenshots): the back control, title, and the guide's
// paragraphs. Used for explanatory guides where images aren't needed.
export default function GuideText({ guide, onBack }: GuideTextProps) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onBack}
        className="flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="h-4 w-4" />
        {HELP_TEXT.back}
      </button>
      <h3 className="font-semibold">{guide.title}</h3>
      <div className="space-y-3 text-sm leading-relaxed text-foreground">
        {(guide.body ?? []).map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}
