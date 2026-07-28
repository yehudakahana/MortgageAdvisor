import { GoogleGenAI } from "@google/genai";
import { ChatRequest, ExtractionRequest, LLMAdapter, LLMResponse } from "./types";
import {
  EXTRACTION_SYSTEM,
  EXTRACTION_PROMPT,
  CHAT_SYSTEM_PROMPT,
  CLIENT_DATA_HEADER,
  buildAdvisorRulesBlock,
  serializeClientData,
} from "./prompts";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Gemini occasionally returns transient 503 (UNAVAILABLE, "high demand") or
// 429 (RESOURCE_EXHAUSTED). Retry those with exponential backoff so a temporary
// overload self-heals instead of needing a manual re-extract.
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

function isTransient(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : JSON.stringify(err);
  return /\b(503|429)\b|UNAVAILABLE|RESOURCE_EXHAUSTED|overloaded|high demand/i.test(msg);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runExtraction(request: ExtractionRequest, model: string): Promise<LLMResponse> {
  const base64 = request.buffer.toString("base64");
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
}

// CHAT is normally served by Claude; this path runs when the router falls back
// to Gemini. Same shared persona prompt and client data, so answers stay
// consistent across providers. Gemini's history role for the assistant is
// "model", not "assistant".
async function runChat(request: ChatRequest, model: string): Promise<LLMResponse> {
  const contents = [
    ...request.chatHistory.map((m) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: m.content }],
    })),
    { role: "user" as const, parts: [{ text: request.userMessage }] },
  ];

  // Advisor rules come last, matching the Claude adapter's system-block order.
  let systemInstruction = `${CHAT_SYSTEM_PROMPT}\n\n${CLIENT_DATA_HEADER}\n${serializeClientData(request.clientData)}`;
  const rulesBlock = buildAdvisorRulesBlock(request.advisorRules);
  if (rulesBlock) systemInstruction += `\n\n${rulesBlock}`;

  const response = await ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction,
      // Matches the Claude chat max_tokens so reply length is provider-agnostic.
      maxOutputTokens: 2048,
    },
  });
  return { content: response.text ?? "" };
}

export const geminiAdapter: LLMAdapter = {
  async run(request, model): Promise<LLMResponse> {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return request.taskType === "EXTRACTION"
          ? await runExtraction(request, model)
          : await runChat(request, model);
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
