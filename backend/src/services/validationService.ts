import { Client, LLMSource } from "../types";
import { routeToLLM } from "./llm/router";
import { buildClientData, loadValidationRules } from "./chatContext";
import { ValidationRuleInput } from "./llm/types";
import { VALIDATION_MESSAGES } from "../constants/messages";

export type ValidationStatus = "pass" | "fail" | "uncertain";

export interface ValidationResult {
  id: string;
  // The advisor's rule text, so the report shows what each verdict refers to.
  rule: string;
  status: ValidationStatus;
  // Hebrew: the value/text the verdict is based on (may be empty).
  evidence: string;
  // Hebrew: one-sentence explanation.
  reason: string;
}

export interface ValidationReport {
  skipped: boolean;
  results: ValidationResult[];
  llm?: LLMSource;
  checkedAt?: string;
}

// Strip optional ```json fences before parsing (Claude may wrap; Gemini uses
// responseMimeType and does not).
function stripFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

// Coerce the model output into trusted shapes. Anything unparseable, unknown,
// or missing becomes "uncertain" rather than a silent pass/fail or a dropped
// rule — a validation check must never assert a verdict it can't support.
function parseRows(raw: string): Record<string, unknown>[] {
  try {
    const parsed: unknown = JSON.parse(stripFences(raw));
    return Array.isArray(parsed)
      ? parsed.filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null)
      : [];
  } catch {
    return [];
  }
}

function normalize(raw: string, rules: ValidationRuleInput[]): ValidationResult[] {
  const statuses: ValidationStatus[] = ["pass", "fail", "uncertain"];
  const byId = new Map(parseRows(raw).map((r) => [r.id, r]));
  return rules.map((rule) => {
    const r = byId.get(rule.id);
    if (!r) {
      return { id: rule.id, rule: rule.text, status: "uncertain", evidence: "", reason: VALIDATION_MESSAGES.noVerdict };
    }
    return {
      id: rule.id,
      rule: rule.text,
      status: statuses.includes(r.status as ValidationStatus) ? (r.status as ValidationStatus) : "uncertain",
      evidence: typeof r.evidence === "string" ? r.evidence : "",
      reason: typeof r.reason === "string" ? r.reason : "",
    };
  });
}

// Runs the advisor's document-validation rules against one client's extracted
// documents. Returns { skipped: true } when the advisor has no validation
// rules — the caller treats that as "nothing to check", not an error.
export async function runValidation(username: string, client: Client): Promise<ValidationReport> {
  const rules = await loadValidationRules(username);
  if (rules.length === 0) return { skipped: true, results: [] };

  const { content, provider, model, usedFallback } = await routeToLLM("VALIDATION", {
    clientData: buildClientData([client]),
    rules,
  });

  return {
    skipped: false,
    results: normalize(content, rules),
    llm: { provider, model, usedFallback },
    checkedAt: new Date().toISOString(),
  };
}
