// Which LLM actually produced a result — including when the fallback provider
// served it. Persisted on extractions and returned on chat replies so the UI
// can show the model in use.
export interface LLMSource {
  provider: string;
  model: string;
  usedFallback?: boolean;
}

export interface ExtractedData {
  // Critical data points (names, dates, amounts, clauses). null when missing/unclear.
  structuredFields?: Record<string, unknown> | null;
  // Clean structured text of the full document.
  rawText?: string | null;
  extractedBy?: LLMSource;
  [key: string]: unknown;
}

export interface ExtractionError {
  error: string;
  // Raw model response captured when JSON parsing failed.
  raw?: string;
  extractedBy?: LLMSource;
}

export interface Document {
  id: string;
  type: "paystub" | "bank_statement" | "id_card" | "other";
  // Original client filename, kept for display only (may be Hebrew).
  filename: string;
  // R2 object key. Optional for backward compat with legacy disk-era records.
  key?: string;
  // Resolved MIME type of the stored object (used for re-extraction/serving).
  mimetype?: string;
  uploadedAt: Date;
  extractedData?: ExtractedData | ExtractionError;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  createdAt: Date;
  documents: Document[];
  notes: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
