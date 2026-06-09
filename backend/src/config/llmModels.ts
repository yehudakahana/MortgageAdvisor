export type TaskType = "EXTRACTION" | "DOCUMENT_GENERATION" | "CHAT";
export type Provider = "claude" | "gemini";

export interface ModelConfig {
  provider: Provider;
  model: string;
}

const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6";
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

export const TASK_MODEL_MAP: Record<TaskType, ModelConfig> = {
  // Extraction runs on Gemini Flash (fast + cheap for PDF/image parsing).
  EXTRACTION: { provider: "gemini", model: GEMINI_MODEL },
  // Chat and document generation stay on Claude.
  DOCUMENT_GENERATION: { provider: "claude", model: CLAUDE_MODEL },
  CHAT: { provider: "claude", model: CLAUDE_MODEL },
};

// Cross-provider fallback used when the primary provider fails (e.g. Gemini
// returns a persistent 503 "high demand"). Extraction falls back to Claude,
// which reads PDFs and images natively.
export const TASK_FALLBACK_MAP: Partial<Record<TaskType, ModelConfig>> = {
  EXTRACTION: { provider: "claude", model: CLAUDE_MODEL },
};
