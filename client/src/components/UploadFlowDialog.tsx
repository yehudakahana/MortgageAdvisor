import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";
import ValidationResultList from "./ValidationResultList";
import type { FlowReport } from "../hooks/useDocumentUpload";
import { COMMON_TEXT, DOCUMENTS_TEXT, UPLOAD_FLOW_TEXT, VALIDATION_TEXT } from "@/lib/strings";

// End-of-flow summary: upload outcome + the document-validation report. Opens
// automatically once the whole flow finishes. Filenames use <bdi> so Latin or
// mixed names don't scramble in RTL.
export default function UploadFlowDialog({
  report,
  onClose,
}: {
  report: FlowReport | null;
  onClose: () => void;
}) {
  if (!report) return null;
  const failedUploads = report.uploads.filter((u) => !u.ok);
  const allUploadsOk = failedUploads.length === 0;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogTitle>
          {allUploadsOk ? UPLOAD_FLOW_TEXT.doneTitle : UPLOAD_FLOW_TEXT.uploadsFailedTitle}
        </DialogTitle>
        <DialogDescription className="mt-1 text-sm">
          {DOCUMENTS_TEXT.uploadSummarySubtitle(
            report.uploads.length - failedUploads.length,
            report.uploads.length
          )}
        </DialogDescription>

        <div className="mt-4 max-h-[60vh] space-y-4 overflow-y-auto">
          {failedUploads.length > 0 && (
            <ul className="space-y-2">
              {failedUploads.map((u, i) => (
                <li key={i} className="min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <XCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
                    <bdi className="truncate">{u.filename}</bdi>
                  </div>
                  {u.reason && <p className="ms-6 text-sm text-destructive">{u.reason}</p>}
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
              <span>{UPLOAD_FLOW_TEXT.reportHeading}</span>
            </div>
            {report.validationError ? (
              <p className="text-sm text-destructive">{UPLOAD_FLOW_TEXT.validationError}</p>
            ) : report.validation?.skipped ?? true ? (
              <p className="text-sm text-muted-foreground">{UPLOAD_FLOW_TEXT.noRules}</p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground/80">{VALIDATION_TEXT.disclaimer}</p>
                <ValidationResultList results={report.validation?.results ?? []} />
              </>
            )}
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>{COMMON_TEXT.close}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
