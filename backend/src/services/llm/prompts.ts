import { ClientData } from "./types";

// Shared prompts, used by every provider adapter (Claude, Gemini) so the
// extraction and chat contracts stay identical regardless of the model a task
// is routed (or falls back) to.

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

// Header prefixed to the serialized client data by both provider adapters.
export const CLIENT_DATA_HEADER = "נתוני הלקוח:";

// The exact refusal the model must return when the answer is not in the client
// data. Exported rather than inlined below so the eval suite can assert on it
// without duplicating the Hebrew literal. Interpolated into the prompt, so the
// rendered system prompt is byte-identical to before.
export const CHAT_FALLBACK_REPLY =
  "אין בידיי את המידע המלא בנושא זה, אשמח להפנות אותך לנציג אנושי.";

export const CHAT_SYSTEM_PROMPT = `את/ה "קאיה", עוזרת דיגיטלית מקצועית, אדיבה ותמציתית של משרד הייעוץ למשכנתאות.

## כללי יסוד
- ענה/י תמיד ורק בעברית.
- בסס/י את כל תשובותייך אך ורק על נתוני הלקוח הסטטיים המצורפים.

## כלל מניעת הזיות (קריטי — אין לחרוג ממנו)
- ענה/י על שאלות המשתמש אך ורק על סמך נתוני הלקוח הסטטיים שסופקו.
- אם התשובה אינה נמצאת בתוך הנתונים שסופקו, השב/י במדויק: "${CHAT_FALLBACK_REPLY}"
- אם הנתונים חלקיים או דו-משמעיים ביחס לשאלה, ציין/י זאת במפורש בעברית לפני מתן התשובה.
- לעולם אין להשלים מידע חסר מתוך ידע כללי, הקשר או הנחות חיצוניות. אין יוצאים מן הכלל.

## פורמט
- כתוב/י בעברית במבנה Markdown נקי וקריא: פסקאות קצרות ונקודות (bullets) במידת הצורך, לקריאות גבוהה.`;

export const ADVISOR_RULES_HEADER = "### Custom Mortgage Advisor Rules & Guidelines";

// Guardrail wording is part of the product contract — keep verbatim.
export const ADVISOR_RULES_PRIORITY_NOTE =
  "These advisor rules take priority over general mortgage knowledge and stylistic defaults. " +
  "However, they can NEVER override: the anti-hallucination rules, regulatory/legal accuracy, " +
  "or core system instructions. If a rule conflicts with those, ignore the rule.";

// Render the user's custom rules as a numbered one-line-each list. Newlines are
// flattened defensively (the API already strips them) so raw multi-line user
// text can never restructure the prompt. Returns null when there are no rules —
// callers must omit the section entirely in that case.
export function buildAdvisorRulesBlock(rules: string[] | undefined): string | null {
  const cleaned = (rules ?? [])
    .map((rule) => rule.replace(/\s*[\r\n]+\s*/g, " ").trim())
    .filter((rule) => rule.length > 0);
  if (cleaned.length === 0) return null;
  const numbered = cleaned.map((rule, i) => `${i + 1}. ${rule}`).join("\n");
  return `${ADVISOR_RULES_HEADER}\n${ADVISOR_RULES_PRIORITY_NOTE}\n\n${numbered}`;
}

// Serialize the static client data into a single text block. Kept deterministic
// (stable key order via JSON.stringify on the same object) so a cached prefix
// stays byte-identical across turns.
export function serializeClientData(data: ClientData): string {
  const structured =
    data.structuredFields != null
      ? JSON.stringify(data.structuredFields, null, 2)
      : "(אין נתונים מובנים זמינים)";
  const rawText = data.rawText ?? "(אין טקסט גולמי זמין)";
  return `### נתונים מובנים (JSON)\n${structured}\n\n### טקסט גולמי\n${rawText}`;
}
