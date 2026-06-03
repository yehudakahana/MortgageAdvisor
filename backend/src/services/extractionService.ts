import { ExtractedData, ExtractionError } from "../types";
import { routeToLLM } from "./llm/router";

function parseJsonResponse(raw: string): ExtractedData {
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return JSON.parse(stripped) as ExtractedData;
}

export async function extractFromFile(
  filePath: string,
  mimeType: string
): Promise<ExtractedData | ExtractionError> {
  const response = await routeToLLM("EXTRACTION", { filePath, mimeType });

  try {
    return parseJsonResponse(response.content);
  } catch {
    // Never throw on malformed JSON — log the raw response and persist it so the
    // failure is visible and debuggable rather than silently swallowed.
    console.error("[extraction] parse_failed — raw LLM response:", response.content);
    return { error: "parse_failed", raw: response.content };
  }
}
