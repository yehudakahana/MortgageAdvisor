import { Client, LLMSource } from "../types";
import { routeToLLM } from "./llm/router";
import { buildClientData, loadValidationRules } from "./chatContext";

export type ValidationStatus = "pass" | "fail" | "uncertain";

export interface ValidationResult {
  id: string;
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

// Coerce the model output into trusted shapes. Anything unparseable or
// unexpected becomes "uncertain" rather than a silent pass/fail — a validation
// check must never assert a verdict it can't support.
function normalize(raw: string, ruleIds: Set<string>): ValidationResult[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripFences(raw));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const statuses: ValidationStatus[] = ["pass", "fail", "uncertain"];
  return parsed
    .map((row) => {
      const r = row as Record<string, unknown>;
      const id = typeof r.id === "string" ? r.id : "";
      const status = statuses.includes(r.status as ValidationStatus)
        ? (r.status as ValidationStatus)
        : "uncertain";
      return {
        id,
        status,
        evidence: typeof r.evidence === "string" ? r.evidence : "",
        reason: typeof r.reason === "string" ? r.reason : "",
      };
    })
    .filter((r) => ruleIds.has(r.id));
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

  const ruleIds = new Set(rules.map((r) => r.id));
  return {
    skipped: false,
    results: normalize(content, ruleIds),
    llm: { provider, model, usedFallback },
    checkedAt: new Date().toISOString(),
  };
}
