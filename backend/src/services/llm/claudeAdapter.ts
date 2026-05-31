import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import { LLMAdapter, LLMRequest, LLMResponse } from "./types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EXTRACTION_SYSTEM =
  "You are a document analysis assistant. Extract all key information from the provided document. " +
  "Return ONLY valid JSON — no markdown fences, no explanation, no wrapper text. " +
  "The response must be parseable directly by JSON.parse().";

const EXTRACTION_PROMPT = `Analyze the document above and extract EVERY piece of information present in it.

Return a JSON object where:
- Every label, field, value, clause, line item, and data point found in the document becomes a key-value pair
- Keys must be camelCase English, values preserve the original content exactly as written
- Group related fields under nested objects when they naturally belong together (e.g. "employee": { "name": "...", "id": "..." })
- Always include these two top-level fields regardless of document type:
  - "rawText": The full document content as clean readable text, preserving all structure and details
  - "documentType": Inferred type ("paystub", "bank_statement", "id_card", "contract", "invoice", "other")

Do not summarize, skip, or omit anything — if it appears in the document, it must appear in the JSON.`;

export const claudeAdapter: LLMAdapter = {
  async run(request: LLMRequest, model: string): Promise<LLMResponse> {
    if (request.taskType === "EXTRACTION") {
      const fileBuffer = fs.readFileSync(request.filePath);
      const base64 = fileBuffer.toString("base64");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (anthropic.beta.messages as any).create({
        model,
        max_tokens: 4096,
        system: EXTRACTION_SYSTEM,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: { type: "base64", media_type: request.mimeType, data: base64 },
              },
              { type: "text", text: EXTRACTION_PROMPT },
            ],
          },
        ],
        betas: ["pdfs-2024-09-25"],
      });

      const textBlock = response.content.find((b: { type: string }) => b.type === "text");
      return { content: (textBlock as { text: string } | undefined)?.text ?? "" };
    }

    const prompt = (request as { prompt: string }).prompt;
    const response = await anthropic.messages.create({
      model,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    return { content: textBlock?.type === "text" ? textBlock.text : "" };
  },
};
