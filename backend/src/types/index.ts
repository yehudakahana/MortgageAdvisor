export interface ExtractedData {
  // Critical data points (names, dates, amounts, clauses). null when missing/unclear.
  structuredFields?: Record<string, unknown> | null;
  // Clean structured text of the full document.
  rawText?: string | null;
  [key: string]: unknown;
}

export interface ExtractionError {
  error: string;
  // Raw model response captured when JSON parsing failed.
  raw?: string;
}

export interface Document {
  id: string;
  type: "paystub" | "bank_statement" | "id_card" | "other";
  filename: string;
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
