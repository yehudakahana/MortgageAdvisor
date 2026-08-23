// Field-level scoring for extraction results.
//
// The extraction prompt lets the model name its own keys, so field identity is
// resolved by matching normalized key names anywhere in the structure. That is
// a deliberate limitation of measuring a schema-less extractor: see evals/README.md.

import { normalizeDate, normalizeText, toNumber } from "./assertions";
import { ExpectedField, ExtractionCaseResult, FieldAttempt, FieldOutcome } from "./types";

// Keys are compared with separators and case removed: net_salary === netSalary.
const keyOf = (key: string) => key.toLowerCase().replace(/[^a-z0-9\u0590-\u05FF]/g, "");

function collect(node: unknown, aliases: Set<string>, out: unknown[]): void {
  if (Array.isArray(node)) {
    for (const item of node) collect(item, aliases, out);
    return;
  }
  if (node === null || typeof node !== "object") return;
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (aliases.has(keyOf(key))) out.push(value);
    collect(value, aliases, out);
  }
}

function valueMatches(field: ExpectedField, candidate: unknown): boolean {
  switch (field.type) {
    case "number":
      return toNumber(candidate) === field.expected;
    case "date":
      return normalizeDate(candidate) !== null && normalizeDate(candidate) === normalizeDate(field.expected);
    case "string":
      return normalizeText(candidate).toLowerCase().includes(normalizeText(field.expected).toLowerCase());
    case "null":
      return candidate === null;
  }
}

function valueAppearsAnywhere(field: ExpectedField, node: unknown): boolean {
  if (Array.isArray(node)) return node.some((item) => valueAppearsAnywhere(field, item));
  if (node !== null && typeof node === "object") {
    return Object.values(node as Record<string, unknown>).some((v) => valueAppearsAnywhere(field, v));
  }
  return valueMatches(field, node);
}

export function scoreField(field: ExpectedField, structured: unknown): FieldAttempt {
  const aliases = new Set([field.field, ...field.aliases].map(keyOf));
  const found: unknown[] = [];
  collect(structured, aliases, found);

  // An expected-null field is the anti-hallucination check: omitting the key or
  // returning null are both correct; inventing a value is the failure.
  if (field.type === "null") {
    const invented = found.filter((v) => v !== null && v !== undefined && normalizeText(v) !== "");
    return {
      field: field.field,
      outcome: invented.length ? "wrong_value" : "hit",
      found: invented.length ? invented : null,
    };
  }

  if (found.length === 0) {
    // Distinguishes key-naming drift from a genuine extraction miss. This is a
    // diagnostic only — it deliberately does NOT upgrade the score, because
    // finding the value under an unpredictable key is not the same as
    // extracting it reliably.
    const elsewhere = valueAppearsAnywhere(field, structured);
    return {
      field: field.field,
      outcome: "key_not_found",
      found: elsewhere ? "value present under an unmatched key" : null,
    };
  }
  if (found.every((v) => v === null || v === undefined)) {
    return { field: field.field, outcome: "null_returned", found: null };
  }
  const hit = found.some((v) => valueMatches(field, v));
  return { field: field.field, outcome: hit ? "hit" : "wrong_value", found: found.length === 1 ? found[0] : found };
}

// Tie-break toward the worse outcome, so a split never reads as a pass.
const FIELD_SEVERITY: Record<FieldOutcome, number> = {
  key_not_found: 3,
  wrong_value: 2,
  null_returned: 1,
  hit: 0,
};

export function aggregate(
  attempts: FieldAttempt[][],
  fields: ExpectedField[]
): ExtractionCaseResult["fields"] {
  const out: ExtractionCaseResult["fields"] = {};
  for (const field of fields) {
    const outcomes = attempts
      .map((run) => run.find((a) => a.field === field.field)?.outcome)
      .filter((o): o is FieldOutcome => o !== undefined);
    const counts = new Map<FieldOutcome, number>();
    for (const o of outcomes) counts.set(o, (counts.get(o) ?? 0) + 1);
    const ranked = [...counts.entries()].sort(
      (a, b) => b[1] - a[1] || FIELD_SEVERITY[b[0]] - FIELD_SEVERITY[a[0]]
    );
    out[field.field] = { outcome: ranked[0][0], inconsistent: counts.size > 1 };
  }
  return out;
}
