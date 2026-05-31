import { useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DOC_TYPE_LABELS, DOC_TYPE_STYLES, formatUploadDate } from "../types/client";
import type { Document } from "../types/client";

interface Props {
  documents: Document[];
  uploadType: string;
  setUploadType: (v: string) => void;
  isUploading: boolean;
  uploadError: string;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function ClientDocuments({ documents, uploadType, setUploadType, isUploading, uploadError, fileInputRef, onFileSelect }: Props) {
  return (
    <div className="bg-indigo-50/40 border-b border-border/50 border-s-2 border-s-indigo-600 px-4 py-4 space-y-4">
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">מסמכים</p>
        {documents.length === 0 ? (
          <p className="text-xs text-muted-foreground/60">לא הועלו מסמכים עדיין.</p>
        ) : (
          <ul className="space-y-2">
            {documents.map((d) => (
              <li key={d.id} className="flex items-center gap-2">
                <Badge className={cn("shrink-0 rounded-full text-[11px] font-medium", DOC_TYPE_STYLES[d.type] ?? "bg-gray-50 text-gray-600 border-gray-200")}>
                  {DOC_TYPE_LABELS[d.type] ?? d.type}
                </Badge>
                <span className="text-xs text-muted-foreground truncate flex-1">{d.filename}</span>
                <span className="text-[11px] text-muted-foreground/50 shrink-0 tabular-nums">{formatUploadDate(d.uploadedAt)}</span>
              </li>
            ))}
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
  );
}
