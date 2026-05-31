import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import { LLMAdapter, LLMRequest, LLMResponse } from "./types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EXTRACTION_SYSTEM =
  "You are a document analysis assistant. Extract all key information from the provided document. " +
  "Return ONLY valid JSON — no markdown fences, no explanation, no wrapper text. " +
  "The response must be parseable directly by JSON.parse().";

const EXTRACTION_PROMPT = `Analyze the document above and extract all key information.

Return a JSON object with these fields:
- "rawText": Clean, readable summary of the full document content preserving all important details
- "documentType": Inferred type ("paystub", "bank_statement", "id_card", "contract", "other")
- "fullName": Full name of the primary subject if present, otherwise null
- "idNumber": ID or passport number if present, otherwise null
- "dates": Array of all significant dates found (ISO format preferred)
- "amounts": Array of monetary amounts as strings with currency (e.g. "12,500 ₪")
- "employer": Employer or company name if present, otherwise null
- "bankName": Bank or financial institution name if present, otherwise null
- "accountNumber": Account number if present — mask all but last 4 digits, otherwise null
- "netSalary": Monthly net salary amount as string if present, otherwise null
- "address": Physical address if present, otherwise null

Also include any additional domain-specific fields that are significant.`;

export const claudeAdapter: LLMAdapter = {
  async run(request: LLMRequest, model: string): Promise<LLMResponse> {
    if (request.taskType === "EXTRACTION") {
      const fileBuffer = fs.readFileSync(request.filePath);
      const base64 = fileBuffer.toString("base64");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (anthropic.beta.messages as any).create({
        model,
        max_tokens: 2048,
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
