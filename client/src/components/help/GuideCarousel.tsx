import { useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Guide } from "@/lib/guides";
import { HELP_TEXT } from "@/lib/strings";

interface GuideCarouselProps {
  guide: Guide;
  onBack: () => void;
}

// One guide as a step-by-step image carousel. RTL: "next" sits on the left.
export default function GuideCarousel({ guide, onBack }: GuideCarouselProps) {
  const [index, setIndex] = useState(0);
  const total = guide.images.length;
  const atStart = index === 0;
  const atEnd = index === total - 1;

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
      <div className="overflow-hidden rounded-lg border bg-muted/40">
        <img
          key={guide.images[index]}
          src={guide.images[index]}
          alt={HELP_TEXT.imageAlt(guide.title, index + 1)}
          className="block max-h-[60dvh] w-full object-contain"
        />
      </div>
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIndex((i) => i - 1)}
          disabled={atStart}
          aria-label={HELP_TEXT.prev}
          className="min-h-11 min-w-11"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground" aria-live="polite">
          {HELP_TEXT.counter(index + 1, total)}
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIndex((i) => i + 1)}
          disabled={atEnd}
          aria-label={HELP_TEXT.next}
          className="min-h-11 min-w-11"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
