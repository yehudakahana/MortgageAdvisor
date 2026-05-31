import { TASK_MODEL_MAP, TaskType } from "../../config/llmModels";
import { LLMRequest, LLMResponse } from "./types";
import { claudeAdapter } from "./claudeAdapter";
import { geminiAdapter } from "./geminiAdapter";

const adapters = {
  claude: claudeAdapter,
  gemini: geminiAdapter,
};

export async function routeToLLM(
  taskType: TaskType,
  payload: Omit<LLMRequest, "taskType">
): Promise<LLMResponse> {
  const config = TASK_MODEL_MAP[taskType];
  const adapter = adapters[config.provider];
  return adapter.run({ ...payload, taskType } as LLMRequest, config.model);
}
