import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";
import { COMMON_TEXT, DOCUMENTS_TEXT } from "@/lib/strings";
import type { UploadResult } from "../hooks/useDocumentUpload";

interface Props {
  results: UploadResult[] | null;
  onClose: () => void;
}

// End-of-batch summary: which files uploaded and which failed, with the reason.
// Filenames are wrapped in <bdi> — Latin/mixed names scramble in RTL otherwise.
export default function UploadSummaryDialog({ results, onClose }: Props) {
  if (!results) return null;
  const succeeded = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogTitle>{DOCUMENTS_TEXT.uploadSummaryTitle}</DialogTitle>
        <DialogDescription className="mt-1 text-sm">
          {DOCUMENTS_TEXT.uploadSummarySubtitle(succeeded.length, results.length)}
        </DialogDescription>

        <div className="mt-4 space-y-4 overflow-y-auto">
          {succeeded.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                {DOCUMENTS_TEXT.uploadSucceededSection}
              </p>
              <ul className="space-y-1.5">
                {succeeded.map((r, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                    <bdi className="truncate">{r.filename}</bdi>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {failed.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                {DOCUMENTS_TEXT.uploadFailedSection}
              </p>
              <ul className="space-y-2">
                {failed.map((r, i) => (
                  <li key={i} className="min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <XCircle className="w-4 h-4 text-destructive shrink-0" />
                      <bdi className="truncate">{r.filename}</bdi>
                    </div>
                    {r.reason && <p className="text-destructive text-sm ms-6">{r.reason}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>{COMMON_TEXT.close}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
