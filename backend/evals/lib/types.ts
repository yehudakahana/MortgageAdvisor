// Shared shapes for the eval suite. Cases are data (JSON under evals/cases),
// these types are the contract the runner reads them through.

export type ChatCategory = "answerable" | "unanswerable" | "adversarial";

// How a chat answer is scored. Programmatic modes are the default; "judge" is
// reserved for open-ended answers no assertion can express.
export type AssertMode = "contains" | "numeric" | "refusal" | "judge";

export interface ChatExpectation {
  mode: AssertMode;
  // contains: every value must appear in the answer.
  values?: string[];
  // numeric: the answer must contain this number (separators normalized away).
  value?: number;
  // refusal / contains: none of these may appear (injection markers, leaked data).
  mustNotContain?: string[];
  // judge: the rubric handed to the judge model, one or two sentences.
  rubric?: string;
}

export interface ChatCase {
  id: string;
  category: ChatCategory;
  // Key into evals/fixtures/clients.ts — decides which clients are in context.
  fixture: string;
  input: string;
  expected: ChatExpectation;
  note: string;
  holdout?: boolean;
}

export type FieldType = "number" | "date" | "string" | "null";

// One ground-truth field. `aliases` exists because the extraction prompt lets
// the model name its own keys, so field identity has to be resolved by search.
export interface ExpectedField {
  field: string;
  aliases: string[];
  type: FieldType;
  expected: string | number | null;
}

export interface ExtractionCase {
  id: string;
  category: "extraction";
  doc: string;
  mimeType: string;
  fields: ExpectedField[];
  note: string;
  holdout?: boolean;
}

export type Outcome = "pass" | "fail" | "error";

export interface ChatAttempt {
  outcome: Outcome;
  reason: string;
  answer: string;
  provider?: string;
  model?: string;
  usedFallback?: boolean;
  judged?: boolean;
}

export interface ChatCaseResult {
  id: string;
  category: ChatCategory;
  holdout: boolean;
  note: string;
  attempts: ChatAttempt[];
  // Majority verdict across attempts.
  outcome: Outcome;
  // True when the attempts did not all agree.
  inconsistent: boolean;
}

// "null_returned" is scored separately from "wrong_value": returning null for a
// field the document genuinely lacks is the prompt's required behavior.
export type FieldOutcome = "hit" | "wrong_value" | "key_not_found" | "null_returned";

export interface FieldAttempt {
  field: string;
  outcome: FieldOutcome;
  found: unknown;
}

export interface ExtractionCaseResult {
  id: string;
  holdout: boolean;
  note: string;
  attempts: FieldAttempt[][];
  // Raw structuredFields per repeat, so a run can be re-scored (new aliases,
  // corrected ground truth) without spending the API calls again.
  raw: unknown[];
  fields: Record<string, { outcome: FieldOutcome; inconsistent: boolean }>;
  provider?: string;
  model?: string;
  usedFallback?: boolean;
  error?: string;
}

export interface EvalRun {
  startedAt: string;
  finishedAt: string;
  repeats: number;
  includedHoldout: boolean;
  chatModel: string;
  extractionModel: string;
  judgeModel: string;
  chat: ChatCaseResult[];
  extraction: ExtractionCaseResult[];
}
