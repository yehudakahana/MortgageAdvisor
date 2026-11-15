import { CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import type { ValidationResult } from "@/api";
import { cn } from "@/lib/utils";
import { VALIDATION_TEXT } from "@/lib/strings";

const STATUS = {
  pass: { icon: CheckCircle2, label: VALIDATION_TEXT.statusPass, cls: "text-emerald-600" },
  fail: { icon: XCircle, label: VALIDATION_TEXT.statusFail, cls: "text-destructive" },
  uncertain: { icon: HelpCircle, label: VALIDATION_TEXT.statusUncertain, cls: "text-amber-600" },
} as const;

// Presentational per-rule validation results: status + reason + the evidence
// the verdict relied on. Shared between the end-of-upload dialog and any other
// report surface.
export default function ValidationResultList({ results }: { results: ValidationResult[] }) {
  if (results.length === 0) {
    return <p className="text-sm text-muted-foreground">{VALIDATION_TEXT.empty}</p>;
  }
  return (
    <ul className="space-y-1.5">
      {results.map((r) => {
        const s = STATUS[r.status];
        const Icon = s.icon;
        return (
          <li key={r.id} className="rounded-md border border-border/60 bg-card px-3 py-2 text-sm">
            <div className={cn("flex items-center gap-1.5 font-medium", s.cls)}>
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{s.label}</span>
            </div>
            {r.reason && <p className="mt-1 text-muted-foreground">{r.reason}</p>}
            {r.evidence && (
              <p className="mt-0.5 text-xs text-muted-foreground/80">
                {VALIDATION_TEXT.evidenceLabel} {r.evidence}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
