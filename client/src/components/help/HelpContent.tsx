import { useState } from "react";
import { ChevronLeft, PlayCircle } from "lucide-react";
import { GUIDES, type Guide } from "@/lib/guides";
import { HELP_TEXT } from "@/lib/strings";
import ContactCard from "./ContactCard";
import GuideCarousel from "./GuideCarousel";

// Shared body of the help sheet (app) and help dialog (login page):
// guide list on top, contact card below. Opening a guide swaps the list
// for its carousel; the contact card stays out of the way meanwhile.
export default function HelpContent() {
  const [active, setActive] = useState<Guide | null>(null);

  if (active) return <GuideCarousel guide={active} onBack={() => setActive(null)} />;

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">{HELP_TEXT.guidesHeading}</h3>
        {GUIDES.length === 0 ? (
          <p className="text-sm text-muted-foreground">{HELP_TEXT.noGuides}</p>
        ) : (
          <ul className="space-y-1.5">
            {GUIDES.map((guide) => (
              <li key={guide.id}>
                <button
                  type="button"
                  onClick={() => setActive(guide)}
                  className="flex min-h-11 w-full items-center gap-3 rounded-lg border px-3 py-2 text-start transition-colors hover:border-indigo-300 hover:bg-indigo-50/50"
                >
                  <PlayCircle className="h-5 w-5 shrink-0 text-indigo-700" />
                  <span className="flex-1 text-sm font-medium">{guide.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {HELP_TEXT.stepsCount(guide.images.length)}
                  </span>
                  <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">{HELP_TEXT.contactHeading}</h3>
        <ContactCard />
      </section>
    </div>
  );
}
