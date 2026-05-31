import { ExtractedData } from "../types";
import { routeToLLM } from "./llm/router";

function parseJsonResponse(raw: string): ExtractedData {
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const parsed = JSON.parse(stripped) as ExtractedData;

  if (typeof parsed.rawText !== "string") {
    parsed.rawText = raw;
  }

  return parsed;
}

export async function extractFromFile(filePath: string, mimeType: string): Promise<ExtractedData> {
  const response = await routeToLLM("EXTRACTION", { filePath, mimeType });

  try {
    return parseJsonResponse(response.content);
  } catch {
    return { rawText: response.content };
  }
}
