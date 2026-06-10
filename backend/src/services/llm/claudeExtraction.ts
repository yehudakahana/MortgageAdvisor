import { anthropic } from "./anthropicClient";
import { ExtractionRequest, LLMResponse } from "./types";
import { EXTRACTION_SYSTEM, EXTRACTION_PROMPT } from "./prompts";

// First text block of a Claude response, or "" when none is present.
function firstText(content: { type: string }[]): string {
  const block = content.find((b) => b.type === "text");
  return (block as { text?: string } | undefined)?.text ?? "";
}

// Extract structured data from a document with Claude. PDFs go through a
// document block (beta); images through an image block. docx/xlsx are not
// natively readable by Claude — throw so the router surfaces the primary
// provider's error instead of a misleading one.
export async function extractWithClaude(
  request: ExtractionRequest,
  model: string
): Promise<LLMResponse> {
  const base64 = request.buffer.toString("base64");
  const mime = request.mimeType;

  if (mime === "application/pdf") {
    const response = await anthropic.beta.messages.create({
      model,
      max_tokens: 4096,
      system: EXTRACTION_SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: base64 },
            },
            { type: "text", text: EXTRACTION_PROMPT },
          ],
        },
      ],
      betas: ["pdfs-2024-09-25"],
    });
    return { content: firstText(response.content) };
  }

  if (mime.startsWith("image/")) {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 4096,
      system: EXTRACTION_SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mime as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
                data: base64,
              },
            },
            { type: "text", text: EXTRACTION_PROMPT },
          ],
        },
      ],
    });
    return { content: firstText(response.content) };
  }

  throw new Error(`Claude extraction does not support mime type: ${mime}`);
}
