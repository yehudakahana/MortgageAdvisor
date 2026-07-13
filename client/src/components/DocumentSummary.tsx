import type { Document } from "../types/client";

// Renders the AI extraction already stored on the document (no new LLM calls):
// the structured key/value fields plus the full extracted text. Null/empty
// values are skipped so only data the model actually found is shown.
function toEntries(fields: unknown): [string, string][] {
  if (!fields || typeof fields !== "object") return [];
  return Object.entries(fields as Record<string, unknown>)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => [k, typeof v === "object" ? JSON.stringify(v) : String(v)]);
}

export default function DocumentSummary({ document }: { document: Document }) {
  const ed = document.extractedData;
  const entries = toEntries(ed?.structuredFields);
  const rawText = typeof ed?.rawText === "string" ? ed.rawText : "";

  if (entries.length === 0 && !rawText) {
    return (
      <p className="text-sm text-muted-foreground/70 py-2">
        אין נתונים שחולצו מהמסמך.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {entries.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            נתונים שחולצו
          </p>
          <dl className="divide-y divide-border/50 rounded-lg border border-border/60">
            {entries.map(([key, value]) => (
              <div key={key} className="flex gap-3 px-3 py-2 text-sm">
                <dt className="text-muted-foreground shrink-0 w-2/5 truncate" dir="ltr">{key}</dt>
                <dd className="text-foreground flex-1 break-words">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {rawText && (
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            טקסט מלא
          </p>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words leading-relaxed">
            {rawText}
          </p>
        </div>
      )}
    </div>
  );
}
