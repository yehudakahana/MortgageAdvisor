import { ChatMessage, ExtractedData } from "../../types";
import { Provider } from "../../config/llmModels";

// Static, per-client context shared across an entire conversation / generation.
// This is the document extraction output (structured JSON + raw text).
export type ClientData = ExtractedData;

export interface ExtractionRequest {
  taskType: "EXTRACTION";
  // The file bytes in memory — sourced from the upload buffer or downloaded from
  // R2 for re-extraction. No local disk path is involved.
  buffer: Buffer;
  mimeType: string;
}

export interface ChatRequest {
  taskType: "CHAT";
  clientData: ClientData;
  chatHistory: ChatMessage[];
  userMessage: string;
  // The advisor's custom knowledge rules, injected into the system prompt
  // after the cached client-data block (so prompt caching stays intact).
  advisorRules?: string[];
}

export type LLMRequest = ExtractionRequest | ChatRequest;

export interface LLMResponse {
  content: string;
}

// Adapter response decorated by the router with the provider/model that
// actually served the request — including when the fallback provider did.
export interface RoutedLLMResponse extends LLMResponse {
  provider: Provider;
  model: string;
  usedFallback: boolean;
}

export interface LLMAdapter {
  run(request: LLMRequest, model: string): Promise<LLMResponse>;
}
