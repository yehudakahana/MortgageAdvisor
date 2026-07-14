import { Document } from "../types";

// Small plain-TypeScript runtime validators for request bodies (no external deps).

const DOCUMENT_TYPES: readonly Document["type"][] = [
  "paystub",
  "bank_statement",
  "id_card",
  "other",
];

export function isDocumentType(value: unknown): value is Document["type"] {
  return (
    typeof value === "string" && (DOCUMENT_TYPES as readonly string[]).includes(value)
  );
}

// A string containing at least one non-whitespace character.
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

// Absent (undefined) or a string — for optional body fields.
export function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}
