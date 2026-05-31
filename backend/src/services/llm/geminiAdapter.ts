import { LLMAdapter, LLMRequest, LLMResponse } from "./types";

// TODO: Implement Gemini adapter
// Steps to wire up:
//   1. Install: npm install @google/generative-ai
//   2. Add GEMINI_API_KEY to .env
//   3. Implement run() for each TaskType using the Gemini SDK
//   4. In config/llmModels.ts, set the desired tasks to { provider: "gemini", model: "gemini-1.5-pro" }
class NotImplementedError extends Error {
  constructor(feature: string) {
    super(`Gemini adapter: "${feature}" is not yet implemented. See TODO in geminiAdapter.ts.`);
    this.name = "NotImplementedError";
  }
}

export const geminiAdapter: LLMAdapter = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async run(_request: LLMRequest, _model: string): Promise<LLMResponse> {
    throw new NotImplementedError("run()");
  },
};
