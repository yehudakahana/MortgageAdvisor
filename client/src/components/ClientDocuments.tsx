import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FileUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DOCUMENTS_TEXT } from "@/lib/strings";
import { DOC_TYPE_LABELS } from "../types/client";
import type { Document } from "../types/client";
import type { UploadResult } from "../hooks/useDocumentUpload";
import DocumentRow from "./DocumentRow";
import UploadSummaryDialog from "./UploadSummaryDialog";

interface Props {
  clientId: string;
  documents: Document[];
  uploadType: string;
  setUploadType: (v: string) => void;
  isUploading: boolean;
  uploadProgress: { current: number; total: number } | null;
  batchResults: UploadResult[] | null;
  clearBatchResults: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onReExtract: (docId: string) => void;
  reExtractingId: string | null;
  timedOutDocIds: string[];
  onDeleteDocument: (docId: string) => void;
  deletingDocId: string | null;
}

export default function ClientDocuments({ clientId, documents, uploadType, setUploadType, isUploading, uploadProgress, batchResults, clearBatchResults, fileInputRef, onFileSelect, onReExtract, reExtractingId, timedOutDocIds, onDeleteDocument, deletingDocId }: Props) {
  return (
    <TooltipProvider delayDuration={150}>
    <div className="bg-indigo-50/40 border-b border-border/50 border-s-2 border-s-indigo-600 px-4 py-4 space-y-4">
      <div>
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">{DOCUMENTS_TEXT.title}</p>
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground/60">{DOCUMENTS_TEXT.empty}</p>
        ) : (
          <ul className="space-y-2.5">
            {documents.map((d) => (
              <DocumentRow
                key={d.id}
                clientId={clientId}
                document={d}
                timedOut={timedOutDocIds.includes(d.id)}
                onReExtract={onReExtract}
                reExtracting={reExtractingId === d.id}
                onDeleteDocument={onDeleteDocument}
                deleting={deletingDocId === d.id}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2 pt-1 border-t border-border/40">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pt-1">{DOCUMENTS_TEXT.uploadTitle}</p>
        <Select value={uploadType} onValueChange={setUploadType}>
          <SelectTrigger className="w-full h-10 max-md:h-11 text-base"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(DOC_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <label className={cn(
          "flex items-center gap-2 w-full border border-dashed border-border rounded-lg px-3 py-2.5 max-md:py-3 cursor-pointer hover:bg-card hover:border-indigo-400 transition-colors group",
          isUploading && "opacity-60 pointer-events-none"
        )}>
          {isUploading
            ? <Loader2 className="w-4 h-4 text-indigo-500 animate-spin shrink-0" />
            : <FileUp className="w-4 h-4 text-muted-foreground/60 group-hover:text-indigo-600 transition-colors shrink-0" />}
          <span className="text-base text-muted-foreground truncate flex-1">
            {uploadProgress
              ? uploadProgress.total > 1
                ? DOCUMENTS_TEXT.uploadingProgress(uploadProgress.current, uploadProgress.total)
                : DOCUMENTS_TEXT.uploading
              : DOCUMENTS_TEXT.choosePdf}
          </span>
          <input type="file" accept=".pdf" multiple ref={fileInputRef} className="sr-only" onChange={onFileSelect} disabled={isUploading} />
        </label>
      </div>

      <UploadSummaryDialog results={batchResults} onClose={clearBatchResults} />
    </div>
    </TooltipProvider>
  );
}
