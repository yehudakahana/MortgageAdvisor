import { TASK_MODEL_MAP, TASK_FALLBACK_MAP, TaskType } from "../../config/llmModels";
import { LLMRequest, RoutedLLMResponse } from "./types";
import { claudeAdapter } from "./claudeAdapter";
import { geminiAdapter } from "./geminiAdapter";

const adapters = {
  claude: claudeAdapter,
  gemini: geminiAdapter,
};

export async function routeToLLM(
  taskType: TaskType,
  payload: Omit<LLMRequest, "taskType">
): Promise<RoutedLLMResponse> {
  const request = { ...payload, taskType } as LLMRequest;
  const primary = TASK_MODEL_MAP[taskType];

  try {
    const result = await adapters[primary.provider].run(request, primary.model);
    return { ...result, provider: primary.provider, model: primary.model, usedFallback: false };
  } catch (err) {
    // If the primary provider fails (e.g. Gemini 503 overload), try the
    // configured fallback provider before giving up. If the fallback also
    // fails, surface both failure reasons in a single error.
    const fallback = TASK_FALLBACK_MAP[taskType];
    if (!fallback || fallback.provider === primary.provider) throw err;

    const reason = err instanceof Error ? err.message : String(err);
    console.warn(
      `[router] ${taskType} via ${primary.provider} failed (${reason}); falling back to ${fallback.provider}`
    );
    try {
      const result = await adapters[fallback.provider].run(request, fallback.model);
      return { ...result, provider: fallback.provider, model: fallback.model, usedFallback: true };
    } catch (fallbackErr) {
      const fbReason = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      console.error(`[router] ${taskType} fallback via ${fallback.provider} also failed: ${fbReason}`);
      throw new Error(
        `primary (${primary.provider}): ${reason}; fallback (${fallback.provider}): ${fbReason}`
      );
    }
  }
}
