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
  // Tenant key: the owning user's id (ALLOWED_USERS username, guest id, or
  // "system" for the shared demo template). Every query must scope by it.
  userId: string;
  // Marks the system-owned demo client cloned into each new guest account.
  isTemplate?: boolean;
  // Marks a guest's copy of that demo client, so it can be excluded from the
  // guest's own creation quota.
  isSample?: boolean;
  name: string;
  phone: string;
  email: string;
  createdAt: Date;
  documents: Document[];
  notes: string;
}

// A rolling-window usage counter for one guest quota.
export interface GuestQuota {
  count: number;
  windowStart: Date;
}

// Temporary demo account. Existence in this collection is what keeps a guest
// JWT valid — cleanup deletes the record and the token dies with it.
export interface GuestUser {
  id: string; // guest_<uuid>
  deviceId?: string; // stable per-browser id, used to resume the account
  ip?: string; // creating IP, used to cap accounts per origin
  createdAt: Date;
  expiresAt: Date;
  usage: {
    chat: GuestQuota;
    reExtract: GuestQuota;
  };
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// A single custom advisor rule injected into the chat system prompt.
export interface KnowledgeRule {
  id: string;
  text: string;
  createdAt: Date;
  updatedAt?: Date;
}

// Per-advisor settings keyed by the JWT username. Users live in the
// ALLOWED_USERS env map (not in the DB), so this document is created lazily on
// the user's first write.
export interface UserSettings {
  username: string;
  customKnowledge: KnowledgeRule[];
}
