import Anthropic from "@anthropic-ai/sdk";

// Single shared Anthropic client, reused by every Claude code path (chat,
// document generation, extraction) so the API key is read once at startup.
export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
