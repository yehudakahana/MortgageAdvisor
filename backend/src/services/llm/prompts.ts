// Shared extraction prompts, used by every provider adapter (Claude, Gemini)
// so the document-extraction contract stays identical regardless of the model
// the EXTRACTION task is routed to.

export const EXTRACTION_SYSTEM =
  "You are a precise document data-extraction engine. " +
  "Return ONLY a single valid JSON object — no markdown fences, no commentary, no wrapper text. " +
  "The output must be directly parseable by JSON.parse().";

export const EXTRACTION_PROMPT = `Analyze the document above and return a JSON object with EXACTLY two top-level fields:

1. "structuredFields": an object of key-value pairs capturing every critical data point — names, dates, amounts, account/ID numbers, and critical clauses. Use clear camelCase English keys; preserve values exactly as written in the document.
2. "rawText": the full document content as clean, structured, readable text that preserves the original order and details.

HARD RULE — missing data:
- If any field is missing, unreadable, or unclear, set its value to null.
- Do NOT guess, infer, approximate, or fill in gaps from context or general knowledge. No exceptions.

Return only the JSON object.`;
