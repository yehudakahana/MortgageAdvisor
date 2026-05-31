export type TaskType = "EXTRACTION" | "DOCUMENT_GENERATION" | "CHAT";
export type Provider = "claude" | "gemini";

export interface ModelConfig {
  provider: Provider;
  model: string;
}

const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6";

export const TASK_MODEL_MAP: Record<TaskType, ModelConfig> = {
  EXTRACTION: { provider: "claude", model: CLAUDE_MODEL },
  DOCUMENT_GENERATION: { provider: "claude", model: CLAUDE_MODEL },
  CHAT: { provider: "claude", model: CLAUDE_MODEL },
};
