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

// ---------------------------------------------------------------------------
// DOCUMENT_GENERATION
// ---------------------------------------------------------------------------

const DOCUMENT_GENERATION_SYSTEM_PROMPT = `את/ה עורך/ת דין מנוסה המנסח/ת מסמכים משפטיים פורמליים בעברית עבור משרד הייעוץ למשכנתאות.

## משימה
נסח/י מסמך משפטי פורמלי בעברית במבנה קבוע:
1. פתיחה
2. הצדדים
3. תנאים והתחייבויות
4. חתימות

## כללים
- מפה/י את השדות מתוך נתוני הלקוח בדייקנות — אין להשמיט מספרים, תאריכים או סעיפים כלשהם.
- אם שדה נדרש חסר בנתונים — סמן/י אותו במפורש באמצעות [חסר נתון] במקום להשלים אותו.
- שמור/י על טון משפטי מקצועי לכל אורך המסמך.
- הפלט חייב להיות מוכן לעיון ולחתימה ללא צורך בעריכה נוספת.`;

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

    if (request.taskType === "CHAT") {
      // System (persona + static client data) is cached; only the volatile
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
    }

    // DOCUMENT_GENERATION
    const documentType = request.documentType ?? "חוזה";
    const instructions = request.instructions
      ? `\n\nהנחיות נוספות:\n${request.instructions}`
      : "";

    const response = await anthropic.messages.create({
      model,
      max_tokens: 4096,
      system: buildCachedSystem(DOCUMENT_GENERATION_SYSTEM_PROMPT, request.clientData),
      messages: [
        {
          role: "user",
          content: `צור/י ${documentType} משפטי מלא ומוכן לחתימה בהתבסס על נתוני הלקוח.${instructions}`,
        },
      ],
    });

    return { content: extractText(response.content) };
  },
};
