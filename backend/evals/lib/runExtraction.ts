// Drives the REAL extraction service: extractFromBuffer, the same call the
// upload and re-extract controllers make. Reads fixture bytes from disk; never
// touches R2 or Mongo.

import fs from "fs";
import path from "path";
import { extractFromBuffer } from "../../src/services/extractionService";
import { aggregate, scoreField } from "./scoreFields";
import { ExtractionCase, ExtractionCaseResult, FieldAttempt } from "./types";

export async function runExtractionCase(
  c: ExtractionCase,
  docsDir: string,
  repeats: number
): Promise<ExtractionCaseResult> {
  const file = path.join(docsDir, c.doc);
  const base = { id: c.id, holdout: c.holdout === true, note: c.note };

  if (!fs.existsSync(file)) {
    return { ...base, attempts: [], raw: [], fields: {}, error: `fixture not found: ${c.doc}` };
  }
  const buffer = fs.readFileSync(file);
  const attempts: FieldAttempt[][] = [];
  const raw: unknown[] = [];
  let source: ExtractionCaseResult["provider"] | undefined;
  let model: string | undefined;
  let usedFallback: boolean | undefined;

  for (let i = 0; i < repeats; i++) {
    try {
      const result = await extractFromBuffer(buffer, c.mimeType);
      source = result.extractedBy?.provider;
      model = result.extractedBy?.model;
      usedFallback = result.extractedBy?.usedFallback;

      if ("error" in result) {
        return { ...base, attempts, raw, fields: {}, provider: source, model, usedFallback, error: String(result.error) };
      }
      raw.push(result.structuredFields ?? null);
      attempts.push(c.fields.map((f) => scoreField(f, result.structuredFields)));
    } catch (err) {
      return {
        ...base,
        attempts,
        raw,
        fields: {},
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return { ...base, attempts, raw, fields: aggregate(attempts, c.fields), provider: source, model, usedFallback };
}
