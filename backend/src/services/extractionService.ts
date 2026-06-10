import { ExtractedData, ExtractionError } from "../types";
import { routeToLLM } from "./llm/router";

// Cap on how much of a malformed LLM response is persisted to Mongo; the full
// response is still logged via console.error for debugging.
const MAX_PERSISTED_RAW_LENGTH = 1000;

function parseJsonResponse(raw: string): ExtractedData {
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return JSON.parse(stripped) as ExtractedData;
}

export async function extractFromBuffer(
  buffer: Buffer,
  mimeType: string
): Promise<ExtractedData | ExtractionError> {
  const response = await routeToLLM("EXTRACTION", { buffer, mimeType });

  try {
    return parseJsonResponse(response.content);
  } catch {
    // Never throw on malformed JSON — log the raw response and persist it so the
    // failure is visible and debuggable rather than silently swallowed.
    console.error("[extraction] parse_failed — raw LLM response:", response.content);
    return { error: "parse_failed", raw: response.content.slice(0, MAX_PERSISTED_RAW_LENGTH) };
  }
}
