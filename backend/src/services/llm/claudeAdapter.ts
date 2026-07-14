import Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "./anthropicClient";
import { ClientData, LLMAdapter, LLMRequest, LLMResponse } from "./types";
import { extractWithClaude } from "./claudeExtraction";

// ---------------------------------------------------------------------------
// CHAT
// ---------------------------------------------------------------------------

const CHAT_SYSTEM_PROMPT = `את/ה "שרה", עוזרת דיגיטלית מקצועית, אדיבה ותמציתית של משרד הייעוץ למשכנתאות.

## כללי יסוד
- ענה/י תמיד ורק בעברית.
- בסס/י את כל תשובותייך אך ורק על נתוני הלקוח הסטטיים המצורפים.

## כלל מניעת הזיות (קריטי — אין לחרוג ממנו)
- ענה/י על שאלות המשתמש אך ורק על סמך נתוני הלקוח הסטטיים שסופקו.
- אם התשובה אינה נמצאת בתוך הנתונים שסופקו, השב/י במדויק: "אין בידיי את המידע המלא בנושא זה, אשמח להפנות אותך לנציג אנושי."
- אם הנתונים חלקיים או דו-משמעיים ביחס לשאלה, ציין/י זאת במפורש בעברית לפני מתן התשובה.
- לעולם אין להשלים מידע חסר מתוך ידע כללי, הקשר או הנחות חיצוניות. אין יוצאים מן הכלל.

## פורמט
- כתוב/י בעברית במבנה Markdown נקי וקריא: פסקאות קצרות ונקודות (bullets) במידת הצורך, לקריאות גבוהה.`;

// Serialize the static client data into a single text block. Kept deterministic
// (stable key order via JSON.stringify on the same object) so the cached prefix
// stays byte-identical across turns.
function serializeClientData(data: ClientData): string {
  const structured =
    data.structuredFields != null
      ? JSON.stringify(data.structuredFields, null, 2)
      : "(אין נתונים מובנים זמינים)";
  const rawText = data.rawText ?? "(אין טקסט גולמי זמין)";
  return `### נתונים מובנים (JSON)\n${structured}\n\n### טקסט גולמי\n${rawText}`;
}

// Build a cached system array: a frozen persona prompt followed by the static
// client data. The cache breakpoint on the last block covers everything before
// it (persona + client data), which is identical across the whole conversation.
function buildCachedSystem(
  personaPrompt: string,
  clientData: ClientData
): Anthropic.TextBlockParam[] {
  return [
    { type: "text", text: personaPrompt },
    {
      type: "text",
      text: `נתוני הלקוח:\n${serializeClientData(clientData)}`,
      cache_control: { type: "ephemeral" },
    },
  ];
}

function extractText(content: Anthropic.ContentBlock[]): string {
  const textBlock = content.find((b) => b.type === "text");
  if (textBlock?.type === "text") return textBlock.text;
  console.warn("[claude] no text block in response");
  return "";
}

export const claudeAdapter: LLMAdapter = {
  async run(request: LLMRequest, model: string): Promise<LLMResponse> {
    if (request.taskType === "EXTRACTION") {
      return extractWithClaude(request, model);
    }

    // CHAT: system (persona + static client data) is cached; only the volatile
    // conversation history + latest user message change between turns.
    const messages: Anthropic.MessageParam[] = [
      ...request.chatHistory.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: request.userMessage },
    ];

    const response = await anthropic.messages.create({
      model,
      max_tokens: 2048,
      system: buildCachedSystem(CHAT_SYSTEM_PROMPT, request.clientData),
      messages,
    });

    return { content: extractText(response.content) };
  },
};
