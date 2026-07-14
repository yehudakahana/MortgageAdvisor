// Fail-fast at boot: both providers are in active use (Gemini for extraction,
// Claude for chat and as the extraction fallback), so each API key must be
// present or the process should refuse to start (mirrors the guard in
// config/r2.ts and the connectDB() check in config/db.ts).
const REQUIRED_ENV = ["ANTHROPIC_API_KEY", "GEMINI_API_KEY"] as const;

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    throw new Error(`[llm] Missing required environment variable: ${key}`);
  }
}

export type TaskType = "EXTRACTION" | "CHAT";
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
  // Chat stays on Claude.
  CHAT: { provider: "claude", model: CLAUDE_MODEL },
};

// Cross-provider fallback used when the primary provider fails (e.g. Gemini
// returns a persistent 503 "high demand", or Claude is overloaded). Extraction
// falls back to Claude, which reads PDFs and images natively; chat falls back
// to Gemini with the same shared persona prompt.
export const TASK_FALLBACK_MAP: Partial<Record<TaskType, ModelConfig>> = {
  EXTRACTION: { provider: "claude", model: CLAUDE_MODEL },
  CHAT: { provider: "gemini", model: GEMINI_MODEL },
};
