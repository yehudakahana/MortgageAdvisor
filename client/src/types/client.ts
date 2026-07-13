export interface Document {
  id: string;
  type: string;
  filename: string;
  // Resolved MIME of the stored file; used to decide inline preview vs download.
  mimetype?: string;
  uploadedAt: string;
  // Set asynchronously by the backend after Gemini extraction. Absent while
  // pending, { error } on failure, otherwise the extracted blob on success.
  extractedData?: {
    structuredFields?: unknown;
    rawText?: unknown;
    error?: string;
  } | null;
}

// Only PDFs and images render inline in a browser tab; Word/Excel files can
// only be downloaded. Legacy records may lack `mimetype`, so fall back to the
// filename extension. Used to decide whether to offer an inline "view" action.
export function canPreviewInline(doc: Document): boolean {
  const mt = doc.mimetype ?? "";
  if (mt === "application/pdf" || mt.startsWith("image/")) return true;
  if (mt) return false;
  return /\.(pdf|jpe?g|png|webp)$/i.test(doc.filename);
}

export type ExtractionStatus = "pending" | "success" | "error";

// Derive the user-facing extraction state of a document from its extractedData.
export function getExtractionStatus(doc: Document): ExtractionStatus {
  const ed = doc.extractedData;
  if (!ed) return "pending";
  if (ed.error) return "error";
  return "success";
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  documents: Document[];
}

export const DOC_TYPE_LABELS: Record<string, string> = {
  paystub: "תלוש שכר",
  bank_statement: "דף חשבון",
  id_card: "תעודת זהות",
  other: "אחר",
};

export const DOC_TYPE_STYLES: Record<string, string> = {
  paystub: "bg-emerald-50 text-emerald-700 border-emerald-200",
  bank_statement: "bg-blue-50 text-blue-700 border-blue-200",
  id_card: "bg-amber-50 text-amber-700 border-amber-200",
  other: "bg-gray-50 text-gray-600 border-gray-200",
};

export function formatUploadDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
}
