import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { COMMON_TEXT, SETTINGS_TEXT } from "@/lib/strings";

const MAX_LENGTH = 200;

interface RuleEditorProps {
  initialValue?: string;
  submitLabel: string;
  // Resolves true on success — the editor clears (add mode) or the parent
  // closes it (edit mode) only then.
  onSubmit: (text: string) => Promise<boolean>;
  onCancel?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

// Shared rule text editor for both "add" and inline "edit" modes: single-line
// behavior (Enter submits instead of inserting a newline) + live counter.
export default function RuleEditor({
  initialValue = "",
  submitLabel,
  onSubmit,
  onCancel,
  disabled = false,
  placeholder,
}: RuleEditorProps) {
  const [value, setValue] = useState(initialValue);
  const [submitting, setSubmitting] = useState(false);

  const trimmed = value.trim();
  const canSubmit = !disabled && !submitting && trimmed.length > 0 && trimmed.length <= MAX_LENGTH;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    const ok = await onSubmit(trimmed);
    setSubmitting(false);
    if (ok && !onCancel) setValue("");
  }

  return (
    <div className="space-y-1.5">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/[\r\n]+/g, " "))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void submit();
          }
        }}
        maxLength={MAX_LENGTH}
        rows={2}
        disabled={disabled || submitting}
        placeholder={placeholder}
        aria-label={submitLabel}
        className="resize-none"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground" dir="ltr">
          {SETTINGS_TEXT.charCounter(value.length)}
        </span>
        <div className="flex gap-2">
          {onCancel && (
            <Button size="sm" variant="outline" onClick={onCancel} disabled={submitting}>
              {COMMON_TEXT.cancel}
            </Button>
          )}
          <Button size="sm" onClick={() => void submit()} disabled={!canSubmit}>
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
