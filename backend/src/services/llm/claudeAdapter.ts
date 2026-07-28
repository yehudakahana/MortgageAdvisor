import Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "./anthropicClient";
import { ClientData, LLMAdapter, LLMRequest, LLMResponse } from "./types";
import { extractWithClaude } from "./claudeExtraction";
import {
  CHAT_SYSTEM_PROMPT,
  CLIENT_DATA_HEADER,
  buildAdvisorRulesBlock,
  serializeClientData,
} from "./prompts";

// Build the system array: a frozen persona prompt followed by the static client
// data. The cache breakpoint on the client-data block covers everything before
// it (persona + client data), which is identical across the whole conversation.
// The advisor's custom rules are volatile user content, so they go AFTER the
// breakpoint — editing rules never invalidates the cached prefix.
// Exported for prompt-assembly tests.
export function buildCachedSystem(
  personaPrompt: string,
  clientData: ClientData,
  advisorRules?: string[]
): Anthropic.TextBlockParam[] {
  const blocks: Anthropic.TextBlockParam[] = [
    { type: "text", text: personaPrompt },
    {
      type: "text",
      text: `${CLIENT_DATA_HEADER}\n${serializeClientData(clientData)}`,
      cache_control: { type: "ephemeral" },
    },
  ];
  const rulesBlock = buildAdvisorRulesBlock(advisorRules);
  if (rulesBlock) blocks.push({ type: "text", text: rulesBlock });
  return blocks;
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
      system: buildCachedSystem(CHAT_SYSTEM_PROMPT, request.clientData, request.advisorRules),
      messages,
    });

    return { content: extractText(response.content) };
  },
};
