import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import { LLMAdapter, LLMRequest, LLMResponse } from "./types";
import { EXTRACTION_SYSTEM, EXTRACTION_PROMPT } from "./prompts";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
  },
};
