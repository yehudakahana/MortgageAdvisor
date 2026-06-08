import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import { LLMAdapter, LLMRequest, LLMResponse } from "./types";
import { EXTRACTION_SYSTEM, EXTRACTION_PROMPT } from "./prompts";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Gemini extraction occasionally returns transient 503 (UNAVAILABLE, "high
// demand") or 429 (RESOURCE_EXHAUSTED). Retry those with exponential backoff so
// a temporary overload self-heals instead of needing a manual re-extract.
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

function isTransient(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : JSON.stringify(err);
  return /\b(503|429)\b|UNAVAILABLE|RESOURCE_EXHAUSTED|overloaded|high demand/i.test(msg);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const geminiAdapter: LLMAdapter = {
  async run(request: LLMRequest, model: string): Promise<LLMResponse> {
    // Gemini is wired only for document extraction; CHAT and DOCUMENT_GENERATION
    // stay on Claude (see config/llmModels.ts).
    if (request.taskType !== "EXTRACTION") {
      throw new Error(
        `Gemini adapter: "${request.taskType}" is not implemented. Route it to Claude in config/llmModels.ts.`
      );
    }

    const base64 = fs.readFileSync(request.filePath).toString("base64");

    let lastErr: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            { inlineData: { mimeType: request.mimeType, data: base64 } },
            { text: EXTRACTION_PROMPT },
          ],
          config: {
            systemInstruction: EXTRACTION_SYSTEM,
            // Force a clean JSON object — no markdown fences for the parser to strip.
            responseMimeType: "application/json",
          },
        });

        return { content: response.text ?? "" };
      } catch (err) {
        lastErr = err;
        if (attempt < MAX_RETRIES && isTransient(err)) {
          const wait = BASE_DELAY_MS * 2 ** attempt; // 1s, 2s, 4s
          console.warn(
            `[gemini] transient error (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${wait}ms`
          );
          await sleep(wait);
          continue;
        }
        throw err;
      }
    }
    throw lastErr;
  },
};
