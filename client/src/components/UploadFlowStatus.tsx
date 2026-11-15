import { Check, Loader2 } from "lucide-react";
import type { FlowStage } from "../hooks/useDocumentUpload";
import { cn } from "@/lib/utils";
import { UPLOAD_FLOW_TEXT } from "@/lib/strings";

// Inline progress for the automatic post-upload flow. Three ordered steps;
// each is pending, active (spinner), or done (check), derived from flowStage.
// Hidden when idle or once the final dialog takes over (done).
const STEPS: { key: FlowStage; label: string }[] = [
  { key: "uploading", label: UPLOAD_FLOW_TEXT.stepUpload },
  { key: "extracting", label: UPLOAD_FLOW_TEXT.stepExtract },
  { key: "validating", label: UPLOAD_FLOW_TEXT.stepValidate },
];
const ORDER: FlowStage[] = ["uploading", "extracting", "validating", "done"];

export default function UploadFlowStatus({ stage }: { stage: FlowStage }) {
  if (stage === "idle" || stage === "done") return null;
  const current = ORDER.indexOf(stage);

  return (
    <ol role="status" aria-live="polite" className="space-y-1.5 rounded-lg bg-card/60 px-3 py-2.5">
      {STEPS.map((step) => {
        const idx = ORDER.indexOf(step.key);
        const state = idx < current ? "done" : idx === current ? "active" : "pending";
        return (
          <li key={step.key} className="flex items-center gap-2 text-sm">
            {state === "done" ? (
              <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
            ) : state === "active" ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-indigo-600" aria-hidden="true" />
            ) : (
              <span className="h-4 w-4 shrink-0 rounded-full border border-border" aria-hidden="true" />
            )}
            <span className={cn(state === "pending" ? "text-muted-foreground/60" : "text-foreground")}>
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
