import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import ConfirmDialog from "./ConfirmDialog";
import KnowledgeRuleRow from "./KnowledgeRuleRow";
import RuleEditor from "./RuleEditor";
import { useKnowledgeRules } from "@/hooks/useKnowledgeRules";
import { COMMON_TEXT, SETTINGS_TEXT } from "@/lib/strings";

interface SettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Settings drawer for the user's custom knowledge rules. In RTL, side="end"
// slides in from the left, away from the clients panel. Rules are fetched
// lazily on the first open only.
export default function SettingsSheet({ open, onOpenChange }: SettingsSheetProps) {
  const { rules, loading, loadFailed, atLimit, load, addRule, updateRule, deleteRule } =
    useKnowledgeRules();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  // Inline outcome of the last add attempt (success confirmation or the
  // failure reason). Auto-clears so stale feedback never lingers.
  const [addFeedback, setAddFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (open) void load();
    else setAddFeedback(null);
  }, [open, load]);

  useEffect(() => {
    if (!addFeedback) return;
    const timer = setTimeout(() => setAddFeedback(null), 5000);
    return () => clearTimeout(timer);
  }, [addFeedback]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="end" className="w-96 max-w-[90vw] p-0">
        <div className="flex h-full flex-col">
          <div className="border-b px-5 pb-3 pt-5">
            <SheetTitle>{SETTINGS_TEXT.title}</SheetTitle>
            <SheetDescription className="mt-1">{SETTINGS_TEXT.description}</SheetDescription>
            <p className="mt-1 text-xs text-muted-foreground">{SETTINGS_TEXT.effectHint}</p>
          </div>

          <div className="border-b px-5 py-4">
            <RuleEditor
              submitLabel={SETTINGS_TEXT.addRule}
              onSubmit={async (text) => {
                const result = await addRule(text);
                setAddFeedback({ ok: result.ok, text: result.message });
                return result.ok;
              }}
              disabled={atLimit || loading}
              placeholder={SETTINGS_TEXT.addPlaceholder}
            />
            {addFeedback && (
              <p
                role="status"
                className={`mt-2 flex items-center gap-1.5 text-xs ${
                  addFeedback.ok ? "text-emerald-600" : "text-destructive"
                }`}
              >
                {addFeedback.ok ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                )}
                {addFeedback.text}
              </p>
            )}
            {atLimit && (
              <p className="mt-2 text-xs text-destructive">{SETTINGS_TEXT.limitReached}</p>
            )}
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto px-5 py-4">
            {loading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
              ))
            ) : loadFailed ? (
              <div className="space-y-2 py-4 text-center">
                <p className="text-sm text-muted-foreground">{SETTINGS_TEXT.loadFailed}</p>
                <Button size="sm" variant="outline" onClick={() => void load(true)}>
                  {COMMON_TEXT.retry}
                </Button>
              </div>
            ) : rules.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {SETTINGS_TEXT.emptyState}
              </p>
            ) : (
              rules.map((rule) => (
                <KnowledgeRuleRow
                  key={rule.id}
                  rule={rule}
                  onUpdate={updateRule}
                  onDeleteRequest={setPendingDeleteId}
                />
              ))
            )}
          </div>
        </div>

        <ConfirmDialog
          open={pendingDeleteId !== null}
          message={SETTINGS_TEXT.confirmDeleteRule}
          onConfirm={() => {
            if (pendingDeleteId) void deleteRule(pendingDeleteId);
            setPendingDeleteId(null);
          }}
          onCancel={() => setPendingDeleteId(null)}
        />
      </SheetContent>
    </Sheet>
  );
}
