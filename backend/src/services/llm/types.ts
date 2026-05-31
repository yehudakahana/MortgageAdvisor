export interface ExtractionRequest {
  taskType: "EXTRACTION";
  filePath: string;
  mimeType: string;
}

export interface ChatRequest {
  taskType: "CHAT";
  prompt: string;
}

export interface DocumentGenerationRequest {
  taskType: "DOCUMENT_GENERATION";
  prompt: string;
}

export type LLMRequest = ExtractionRequest | ChatRequest | DocumentGenerationRequest;

export interface LLMResponse {
  content: string;
}

export interface LLMAdapter {
  run(request: LLMRequest, model: string): Promise<LLMResponse>;
}
