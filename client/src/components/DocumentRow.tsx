import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, CheckCircle2, AlertCircle, RotateCw, Info, Trash2, Eye, Download, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { DOCUMENTS_TEXT } from "@/lib/strings";
import { useDocumentFile } from "../hooks/useDocumentFile";
import { DOC_TYPE_LABELS, DOC_TYPE_STYLES, formatUploadDate, getExtractionStatus, canPreviewInline } from "../types/client";
import type { Document } from "../types/client";
import DocumentSummary from "./DocumentSummary";
import LLMSourceNote from "./LLMSourceNote";

interface Props {
  clientId: string;
  document: Document;
  timedOut: boolean;
  onReExtract: (docId: string) => void;
  reExtracting: boolean;
  onDeleteDocument: (docId: string) => void;
  deleting: boolean;
}

// Small icon button shared by the per-document row actions.
function IconAction({ label, onClick, disabled, active, children }: { label: string; onClick: () => void; disabled?: boolean; active?: boolean; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button" aria-label={label} disabled={disabled} onClick={onClick}
          className={cn(
            "text-muted-foreground/40 hover:text-indigo-600 transition-colors shrink-0 disabled:opacity-40 disabled:hover:text-muted-foreground/40",
            active && "text-indigo-600"
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function ReExtractButton({ docId, onReExtract, reExtracting }: { docId: string; onReExtract: (docId: string) => void; reExtracting: boolean }) {
  return (
    <Button size="sm" variant="outline" className="h-8 px-2.5 text-sm gap-1 max-md:h-9 max-md:px-3" disabled={reExtracting} onClick={() => onReExtract(docId)}>
      {reExtracting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />}
      {DOCUMENTS_TEXT.retryExtraction}
    </Button>
  );
}

export default function DocumentRow({ clientId, document: d, timedOut, onReExtract, reExtracting, onDeleteDocument, deleting }: Props) {
  const [showSummary, setShowSummary] = useState(false);
  const { loading, open, download } = useDocumentFile(clientId, d.id);
  const status = getExtractionStatus(d);
  const busy = loading !== null;
  const previewable = canPreviewInline(d);

  return (
    <li className="space-y-1">
      <div className="flex items-center gap-2">
        <Badge className={cn("shrink-0 rounded-full text-sm font-medium", DOC_TYPE_STYLES[d.type] ?? "bg-gray-50 text-gray-600 border-gray-200")}>
          {DOC_TYPE_LABELS[d.type] ?? d.type}
        </Badge>
        <span className="text-sm text-muted-foreground truncate flex-1">{d.filename}</span>
        <span className="text-sm text-muted-foreground/50 shrink-0 tabular-nums">{formatUploadDate(d.uploadedAt)}</span>
        <div className="flex items-center gap-2 shrink-0">
          {previewable && (
            <IconAction label={DOCUMENTS_TEXT.view} disabled={busy} onClick={open}>
              {loading === "view" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            </IconAction>
          )}
          <IconAction label={DOCUMENTS_TEXT.download} disabled={busy} onClick={download}>
            {loading === "download" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          </IconAction>
          <IconAction label={DOCUMENTS_TEXT.aiSummary} active={showSummary} disabled={status !== "success"} onClick={() => setShowSummary((v) => !v)}>
            <FileText className="w-4 h-4" />
          </IconAction>
          <button
            type="button" aria-label={DOCUMENTS_TEXT.deleteDocument}
            disabled={deleting}
            onClick={() => onDeleteDocument(d.id)}
            className="text-muted-foreground/40 hover:text-destructive transition-colors shrink-0 disabled:opacity-50"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
      {status === "pending" && !timedOut && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground ps-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>{DOCUMENTS_TEXT.extracting}</span>
        </div>
      )}
      {status === "pending" && timedOut && (
        <div className="flex items-center gap-2 ps-1">
          <span className="text-sm text-muted-foreground flex-1">
            {DOCUMENTS_TEXT.extractionStillRunning}
          </span>
          <ReExtractButton docId={d.id} onReExtract={onReExtract} reExtracting={reExtracting} />
        </div>
      )}
      {status === "success" && (
        <div className="flex items-center gap-1.5 text-sm text-emerald-600 ps-1">
          <CheckCircle2 className="w-3 h-3" />
          <span>{DOCUMENTS_TEXT.extractionSucceeded}</span>
          {d.extractedData?.extractedBy && <LLMSourceNote source={d.extractedData.extractedBy} />}
        </div>
      )}
      {status === "error" && (
        <div className="flex items-center gap-2 ps-1 max-md:flex-wrap">
          <span className="flex items-center gap-1.5 text-sm text-destructive">
            <AlertCircle className="w-3 h-3" />
            {DOCUMENTS_TEXT.extractionFailed}
          </span>
          {d.extractedData?.extractedBy && <LLMSourceNote source={d.extractedData.extractedBy} />}
          {d.extractedData?.error && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" aria-label={DOCUMENTS_TEXT.showErrorMessage} className="text-muted-foreground hover:text-destructive transition-colors">
                  <Info className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent dir="ltr" className="max-w-xs text-left break-words">
                {d.extractedData.error}
              </TooltipContent>
            </Tooltip>
          )}
          <ReExtractButton docId={d.id} onReExtract={onReExtract} reExtracting={reExtracting} />
        </div>
      )}
      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent>
          <DialogTitle className="pe-8 truncate">{d.filename}</DialogTitle>
          <DialogDescription>{DOCUMENTS_TEXT.aiSummary} — {DOC_TYPE_LABELS[d.type] ?? d.type}</DialogDescription>
          <div className="mt-4 overflow-y-auto">
            <DocumentSummary doc={d} />
          </div>
        </DialogContent>
      </Dialog>
    </li>
  );
}
