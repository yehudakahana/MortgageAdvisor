import { ExtractedData, ExtractionError } from "../types";
import { routeToLLM } from "./llm/router";

// Cap on how much of a malformed LLM response is persisted to Mongo; the full
// response is still logged via console.error for debugging.
const MAX_PERSISTED_RAW_LENGTH = 1000;

// Bounds for the validated extraction payload. A prompt-injected document
// could make the model return hostile JSON (huge, deeply nested, or with
// non-string blobs) that would otherwise land verbatim in Mongo
// (Schema.Types.Mixed) — so every value is checked before persisting.
const MAX_STRUCTURED_KEYS = 500;
const MAX_KEY_LENGTH = 200;
const MAX_STRING_VALUE_CHARS = 20000;
const MAX_ARRAY_ITEMS = 500;
const MAX_RAW_TEXT_CHARS = 500000;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeValue(value: unknown): unknown {
  if (value == null || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return value.length > MAX_STRING_VALUE_CHARS
      ? value.slice(0, MAX_STRING_VALUE_CHARS)
      : value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_ITEMS).map(sanitizeValue);
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value).slice(0, MAX_STRUCTURED_KEYS)) {
      if (typeof k === "string" && k.length > 0 && k.length <= MAX_KEY_LENGTH) {
        out[k] = sanitizeValue(v);
      }
    }
    return out;
  }
  // Functions, symbols, class instances — never persist.
  return null;
}

function sanitizeStructuredFields(value: unknown): Record<string, unknown> | null {
  if (value == null) return null;
  if (!isPlainObject(value)) {
    console.warn("[extraction] structuredFields is not an object; dropping it");
    return null;
  }
  return sanitizeValue(value) as Record<string, unknown>;
}

function sanitizeRawText(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") {
    console.warn("[extraction] rawText is not a string; dropping it");
    return null;
  }
  return value.length > MAX_RAW_TEXT_CHARS ? value.slice(0, MAX_RAW_TEXT_CHARS) : value;
}

// Validate the model's JSON against the extraction contract (exactly the two
// documented top-level fields) before it is persisted. Extra top-level keys
// are dropped — the contract is an allowlist, not a passthrough.
// Exported for unit tests.
export function parseAndValidateJsonResponse(raw: string): ExtractedData {
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const parsed: unknown = JSON.parse(stripped);
  if (!isPlainObject(parsed)) {
    throw new Error("extraction response is not a JSON object");
  }
  return {
    structuredFields: sanitizeStructuredFields(parsed.structuredFields),
    rawText: sanitizeRawText(parsed.rawText),
  };
}

export async function extractFromBuffer(
  buffer: Buffer,
  mimeType: string
): Promise<ExtractedData | ExtractionError> {
  const response = await routeToLLM("EXTRACTION", { buffer, mimeType });
  // Persisted alongside the result so the UI can show which model extracted it.
  const extractedBy = {
    provider: response.provider,
    model: response.model,
    usedFallback: response.usedFallback,
  };

  try {
    return { ...parseAndValidateJsonResponse(response.content), extractedBy };
  } catch {
    // Never throw on malformed JSON — log the raw response and persist it so the
    // failure is visible and debuggable rather than silently swallowed.
    console.error("[extraction] parse_failed — raw LLM response:", response.content);
    return {
      error: "parse_failed",
      raw: response.content.slice(0, MAX_PERSISTED_RAW_LENGTH),
      extractedBy,
    };
  }
}
