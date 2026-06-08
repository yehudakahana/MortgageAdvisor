import { ChatMessage, ExtractedData } from "../../types";

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
}

export interface DocumentGenerationRequest {
  taskType: "DOCUMENT_GENERATION";
  clientData: ClientData;
  // Defaults to a contract when omitted.
  documentType?: string;
  // Optional extra instructions for the generated document.
  instructions?: string;
}

export type LLMRequest = ExtractionRequest | ChatRequest | DocumentGenerationRequest;

export interface LLMResponse {
  content: string;
}

export interface LLMAdapter {
  run(request: LLMRequest, model: string): Promise<LLMResponse>;
}
