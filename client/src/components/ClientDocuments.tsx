import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { FileUp, Loader2, CheckCircle2, AlertCircle, RotateCw, Info, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DOC_TYPE_LABELS, DOC_TYPE_STYLES, formatUploadDate, getExtractionStatus } from "../types/client";
import type { Document } from "../types/client";

interface Props {
  documents: Document[];
  uploadType: string;
  setUploadType: (v: string) => void;
  isUploading: boolean;
  uploadError: string;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onReExtract: (docId: string) => void;
  reExtractingId: string | null;
  timedOutDocIds: string[];
  onDeleteDocument: (docId: string) => void;
  deletingDocId: string | null;
}

function ReExtractButton({ docId, onReExtract, reExtracting }: { docId: string; onReExtract: (docId: string) => void; reExtracting: boolean }) {
  return (
    <Button size="sm" variant="outline" className="h-6 px-2 text-[11px] gap-1" disabled={reExtracting} onClick={() => onReExtract(docId)}>
      {reExtracting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />}
      נסה שוב
    </Button>
  );
}

export default function ClientDocuments({ documents, uploadType, setUploadType, isUploading, uploadError, fileInputRef, onFileSelect, onReExtract, reExtractingId, timedOutDocIds, onDeleteDocument, deletingDocId }: Props) {
  return (
    <TooltipProvider delayDuration={150}>
    <div className="bg-indigo-50/40 border-b border-border/50 border-s-2 border-s-indigo-600 px-4 py-4 space-y-4">
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">מסמכים</p>
        {documents.length === 0 ? (
          <p className="text-xs text-muted-foreground/60">לא הועלו מסמכים עדיין.</p>
        ) : (
          <ul className="space-y-2.5">
            {documents.map((d) => {
              const status = getExtractionStatus(d);
              const timedOut = timedOutDocIds.includes(d.id);
              return (
                <li key={d.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className={cn("shrink-0 rounded-full text-[11px] font-medium", DOC_TYPE_STYLES[d.type] ?? "bg-gray-50 text-gray-600 border-gray-200")}>
                      {DOC_TYPE_LABELS[d.type] ?? d.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground truncate flex-1">{d.filename}</span>
                    <span className="text-[11px] text-muted-foreground/50 shrink-0 tabular-nums">{formatUploadDate(d.uploadedAt)}</span>
                    <button
                      type="button" aria-label="מחק מסמך"
                      disabled={deletingDocId === d.id}
                      onClick={() => onDeleteDocument(d.id)}
                      className="text-muted-foreground/40 hover:text-destructive transition-colors shrink-0 disabled:opacity-50"
                    >
                      {deletingDocId === d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {status === "pending" && !timedOut && (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground ps-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>מחלץ נתונים מהמסמך...</span>
                    </div>
                  )}
                  {status === "pending" && timedOut && (
                    <div className="flex items-center gap-2 ps-1">
                      <span className="text-[11px] text-muted-foreground flex-1">
                        חילוץ המסמך עדיין רץ — אפשר לנסות שוב עם כפתור החילוץ מחדש.
                      </span>
                      <ReExtractButton docId={d.id} onReExtract={onReExtract} reExtracting={reExtractingId === d.id} />
                    </div>
                  )}
                  {status === "success" && (
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 ps-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>המסמך חולץ בהצלחה</span>
                    </div>
                  )}
                  {status === "error" && (
                    <div className="flex items-center gap-2 ps-1">
                      <span className="flex items-center gap-1.5 text-[11px] text-destructive">
                        <AlertCircle className="w-3 h-3" />
                        חילוץ המסמך נכשל
                      </span>
                      {d.extractedData?.error && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" aria-label="הצג את הודעת השגיאה" className="text-muted-foreground hover:text-destructive transition-colors">
                              <Info className="w-3.5 h-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent dir="ltr" className="max-w-xs text-left break-words">
                            {d.extractedData.error}
                          </TooltipContent>
                        </Tooltip>
                      )}
                      <ReExtractButton docId={d.id} onReExtract={onReExtract} reExtracting={reExtractingId === d.id} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="space-y-2 pt-1 border-t border-border/40">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pt-1">העלאת מסמך</p>
        <Select value={uploadType} onValueChange={setUploadType}>
          <SelectTrigger className="w-full h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="paystub">תלוש שכר</SelectItem>
            <SelectItem value="bank_statement">דף חשבון</SelectItem>
            <SelectItem value="id_card">תעודת זהות</SelectItem>
            <SelectItem value="other">אחר</SelectItem>
          </SelectContent>
        </Select>

        <label className={cn(
          "flex items-center gap-2 w-full border border-dashed border-border rounded-lg px-3 py-2.5 cursor-pointer hover:bg-card hover:border-indigo-400 transition-colors group",
          isUploading && "opacity-60 pointer-events-none"
        )}>
          {isUploading
            ? <Loader2 className="w-4 h-4 text-indigo-500 animate-spin shrink-0" />
            : <FileUp className="w-4 h-4 text-muted-foreground/60 group-hover:text-indigo-600 transition-colors shrink-0" />}
          <span className="text-sm text-muted-foreground truncate flex-1">
            {isUploading ? "מעלה..." : "בחר קובץ PDF להעלאה..."}
          </span>
          <input type="file" accept=".pdf" ref={fileInputRef} className="sr-only" onChange={onFileSelect} disabled={isUploading} />
        </label>

        {uploadError && <p className="text-destructive text-xs">{uploadError}</p>}
      </div>
    </div>
    </TooltipProvider>
  );
}
