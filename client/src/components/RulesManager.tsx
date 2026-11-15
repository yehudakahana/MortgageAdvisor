import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "./ConfirmDialog";
import KnowledgeRuleRow from "./KnowledgeRuleRow";
import RuleEditor from "./RuleEditor";
import { useKnowledgeRules } from "@/hooks/useKnowledgeRules";
import { RuleCategory } from "@/api/settings";
import { COMMON_TEXT, SETTINGS_TEXT } from "@/lib/strings";

interface Copy {
  description: string;
  effectHint: string;
  addPlaceholder: string;
  emptyState: string;
}

interface Props {
  category: RuleCategory;
  copy: Copy;
}

// One category's rule list + editor. Mounted lazily per tab, so switching tabs
// loads that category's rules on first view. Self-contained: owns its own
// hook instance, inline add feedback, and delete confirmation.
export default function RulesManager({ category, copy }: Props) {
  const { rules, loading, loadFailed, atLimit, load, addRule, updateRule, deleteRule } =
    useKnowledgeRules(category);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [addFeedback, setAddFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!addFeedback) return;
    const timer = setTimeout(() => setAddFeedback(null), 5000);
    return () => clearTimeout(timer);
  }, [addFeedback]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-5 py-3">
        <p className="text-sm text-muted-foreground">{copy.description}</p>
        <p className="mt-1 text-xs text-muted-foreground/80">{copy.effectHint}</p>
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
          placeholder={copy.addPlaceholder}
        />
        {addFeedback && (
          <p
            role="status"
            className={`mt-2 flex items-center gap-1.5 text-xs ${
              addFeedback.ok ? "text-emerald-600" : "text-destructive"
            }`}
          >
            {addFeedback.ok ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            )}
            {addFeedback.text}
          </p>
        )}
        {atLimit && <p className="mt-2 text-xs text-destructive">{SETTINGS_TEXT.limitReached}</p>}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-5 py-4">
        {loading ? (
          [1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />)
        ) : loadFailed ? (
          <div className="space-y-2 py-4 text-center">
            <p className="text-sm text-muted-foreground">{SETTINGS_TEXT.loadFailed}</p>
            <Button size="sm" variant="outline" onClick={() => void load(true)}>
              {COMMON_TEXT.retry}
            </Button>
          </div>
        ) : rules.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{copy.emptyState}</p>
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

      <ConfirmDialog
        open={pendingDeleteId !== null}
        message={SETTINGS_TEXT.confirmDeleteRule}
        onConfirm={() => {
          if (pendingDeleteId) void deleteRule(pendingDeleteId);
          setPendingDeleteId(null);
        }}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
