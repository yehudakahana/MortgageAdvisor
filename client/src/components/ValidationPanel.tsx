import { useState } from "react";
import { ShieldCheck, CheckCircle2, XCircle, HelpCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getValidation, ValidationResult } from "@/api";
import { cn } from "@/lib/utils";
import { VALIDATION_TEXT } from "@/lib/strings";

type State = "idle" | "loading" | "error" | "skipped" | "done";

const STATUS = {
  pass: { icon: CheckCircle2, label: VALIDATION_TEXT.statusPass, cls: "text-emerald-600" },
  fail: { icon: XCircle, label: VALIDATION_TEXT.statusFail, cls: "text-destructive" },
  uncertain: { icon: HelpCircle, label: VALIDATION_TEXT.statusUncertain, cls: "text-amber-600" },
} as const;

// Document-validation report under a client's documents. Runs on demand: the
// backend returns { skipped: true } when the advisor has no validation rules,
// so the button is always safe to press (no rules => no LLM call, no cost).
export default function ValidationPanel({ clientId }: { clientId: string }) {
  const [state, setState] = useState<State>("idle");
  const [results, setResults] = useState<ValidationResult[]>([]);

  async function run() {
    setState("loading");
    try {
      const report = await getValidation(clientId);
      if (report.skipped) {
        setState("skipped");
        return;
      }
      setResults(report.results);
      setState("done");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="space-y-2 pt-1 border-t border-border/40">
      <Button
        size="sm"
        variant="outline"
        onClick={() => void run()}
        disabled={state === "loading"}
        className="w-full gap-2 max-md:h-11"
      >
        {state === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        )}
        {state === "loading" ? VALIDATION_TEXT.running : VALIDATION_TEXT.run}
      </Button>

      {state === "skipped" && (
        <p role="status" className="text-xs text-muted-foreground">
          {VALIDATION_TEXT.skipped}
        </p>
      )}
      {state === "error" && (
        <p role="status" className="text-xs text-destructive">
          {VALIDATION_TEXT.failed}
        </p>
      )}

      {state === "done" && (
        <div role="status" className="space-y-2">
          <p className="text-xs text-muted-foreground/80">{VALIDATION_TEXT.disclaimer}</p>
          {results.length === 0 ? (
            <p className="text-xs text-muted-foreground">{VALIDATION_TEXT.empty}</p>
          ) : (
            <ul className="space-y-1.5">
              {results.map((r) => {
                const s = STATUS[r.status];
                const Icon = s.icon;
                return (
                  <li
                    key={r.id}
                    className="rounded-md border border-border/60 bg-card px-3 py-2 text-sm"
                  >
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
          )}
        </div>
      )}
    </div>
  );
}
