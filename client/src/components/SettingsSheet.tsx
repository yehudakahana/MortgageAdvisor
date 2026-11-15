import { useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import RulesManager from "./RulesManager";
import { RuleCategory } from "@/api/settings";
import { cn } from "@/lib/utils";
import { RULES_TABS, SETTINGS_TEXT, VALIDATION_RULES_TEXT } from "@/lib/strings";

interface SettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TABS: { id: RuleCategory; label: string }[] = [
  { id: "chat", label: RULES_TABS.chat },
  { id: "document_validation", label: RULES_TABS.validation },
];

// Settings drawer for the advisor's custom rules, split into two categories:
// chat rules (shape Kaya's answers) and document-validation rules (checked
// against uploaded documents). In RTL, side="end" slides in from the left.
export default function SettingsSheet({ open, onOpenChange }: SettingsSheetProps) {
  const [tab, setTab] = useState<RuleCategory>("chat");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="end" className="w-96 max-w-[90vw] p-0">
        <div className="flex h-full flex-col">
          <div className="px-5 pb-2 pt-5">
            <SheetTitle>{SETTINGS_TEXT.title}</SheetTitle>
            <SheetDescription className="sr-only">{SETTINGS_TEXT.description}</SheetDescription>
          </div>

          <div role="tablist" aria-label={SETTINGS_TEXT.title} className="flex gap-1 px-5">
            {TABS.map(({ id, label }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  role="tab"
                  type="button"
                  aria-selected={active}
                  onClick={() => setTab(id)}
                  className={cn(
                    "rounded-t-md px-3 py-2 text-sm font-medium transition-colors max-md:py-2.5",
                    active
                      ? "border-b-2 border-indigo-600 text-indigo-700"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-hidden border-t">
            {tab === "chat" ? (
              <RulesManager
                key="chat"
                category="chat"
                copy={{
                  description: SETTINGS_TEXT.description,
                  effectHint: SETTINGS_TEXT.effectHint,
                  addPlaceholder: SETTINGS_TEXT.addPlaceholder,
                  emptyState: SETTINGS_TEXT.emptyState,
                }}
              />
            ) : (
              <RulesManager
                key="document_validation"
                category="document_validation"
                copy={VALIDATION_RULES_TEXT}
              />
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
