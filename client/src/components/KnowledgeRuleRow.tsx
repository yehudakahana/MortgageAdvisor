import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import RuleEditor from "./RuleEditor";
import { KnowledgeRule } from "@/api/settings";
import { SETTINGS_TEXT } from "@/lib/strings";

interface KnowledgeRuleRowProps {
  rule: KnowledgeRule;
  onUpdate: (id: string, text: string) => Promise<boolean>;
  // Delete confirmation (ConfirmDialog) is owned by the parent sheet.
  onDeleteRequest: (id: string) => void;
}

// One rule row: static text with edit/delete actions, swapping to an inline
// editor while editing.
export default function KnowledgeRuleRow({ rule, onUpdate, onDeleteRequest }: KnowledgeRuleRowProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="rounded-md border bg-muted/40 p-2.5">
        <RuleEditor
          initialValue={rule.text}
          submitLabel={SETTINGS_TEXT.saveRule}
          onSubmit={async (text) => {
            const ok = await onUpdate(rule.id, text);
            if (ok) setEditing(false);
            return ok;
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-2 rounded-md border p-2.5">
      <p className="flex-1 text-sm leading-relaxed break-words min-w-0">{rule.text}</p>
      <div className="flex gap-1 flex-shrink-0">
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={() => setEditing(true)}
          aria-label={SETTINGS_TEXT.editRule}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => onDeleteRequest(rule.id)}
          aria-label={SETTINGS_TEXT.deleteRule}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
