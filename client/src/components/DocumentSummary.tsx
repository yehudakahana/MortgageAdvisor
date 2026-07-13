import { useState } from "react";
import { fieldLabel, groupFields } from "@/lib/documentFields";
import { FieldList, FieldTable, Label, Section } from "./DocumentSummaryFields";
import type { Document } from "../types/client";

// Renders the AI extraction already stored on the document (no new LLM calls).
// The stored blob is English-keyed and mixes scalars, nested objects and row
// arrays, so we label it in Hebrew and give each shape its own presentation:
// headline amounts as tiles, plain fields as a list, repeating rows as a table.
// The full OCR text stays collapsed — it's a fallback, not the summary.
export default function DocumentSummary({ doc }: { doc: Document }) {
  const [showRaw, setShowRaw] = useState(false);
  const ed = doc.extractedData;
  const { scalars, objects, tables, highlights } = groupFields(ed?.structuredFields);
  const rawText = typeof ed?.rawText === "string" ? ed.rawText : "";
  const hasFields = highlights.length + scalars.length + objects.length + tables.length > 0;

  if (!hasFields && !rawText) {
    return <p className="text-sm text-muted-foreground/70 py-2">אין נתונים שחולצו מהמסמך.</p>;
  }

  return (
    <div className="space-y-5">
      {highlights.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {highlights.map(([key, value]) => (
            <div key={key} className="rounded-lg border border-indigo-200 bg-indigo-50/50 px-3 py-2.5">
              <p className="text-[11px] text-indigo-700/70 mb-0.5">
                <Label field={key} />
              </p>
              <p className="text-lg font-semibold text-indigo-900 tabular-nums" dir="ltr">
                {value}
              </p>
            </div>
          ))}
        </div>
      )}

      {scalars.length > 0 && (
        <Section title="פרטי המסמך">
          <FieldList entries={scalars} />
        </Section>
      )}

      {objects.map(([key, value]) => {
        // A highlight key nested inside a group (e.g. salarySubjectToNational-
        // Insurance) belongs in that group's list, not the top tiles — merge it
        // back in rather than letting it fall out of the render.
        const nested = groupFields(value);
        const entries = [...nested.highlights, ...nested.scalars];
        return entries.length === 0 ? null : (
          <Section key={key} title={fieldLabel(key)}>
            <FieldList entries={entries} />
          </Section>
        );
      })}

      {tables.map(([key, rows]) => (
        <Section key={key} title={fieldLabel(key)}>
          <FieldTable rows={rows} />
        </Section>
      ))}

      {rawText && (
        <div>
          <button
            type="button"
            onClick={() => setShowRaw((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            {showRaw ? "הסתר את הטקסט המלא" : "הצג את הטקסט המלא מהמסמך"}
          </button>
          {showRaw && (
            <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap break-words leading-relaxed">
              {rawText}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
