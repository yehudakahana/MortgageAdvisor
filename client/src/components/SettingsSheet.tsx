import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

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
              onSubmit={addRule}
              disabled={atLimit || loading}
              placeholder={SETTINGS_TEXT.addPlaceholder}
            />
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
