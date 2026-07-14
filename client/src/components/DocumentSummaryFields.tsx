import { cn } from "@/lib/utils";
import { fieldLabel, formatValue, isEmpty, isNumericValue, isTranslatedLabel, tableColumns } from "@/lib/documentFields";

// Presentation primitives for <DocumentSummary />. A label that came from the
// dictionary is Hebrew (RTL); an un-translated key falls back to English and is
// forced LTR. Numeric values are LTR + tabular so amounts line up in a column.

export function Label({ field }: { field: string }) {
  return (
    <span dir={isTranslatedLabel(field) ? "rtl" : "ltr"} className="truncate">
      {fieldLabel(field)}
    </span>
  );
}

export function Value({ value }: { value: string }) {
  const numeric = isNumericValue(value);
  return (
    <span dir={numeric ? "ltr" : "auto"} className={cn("break-words", numeric && "tabular-nums")}>
      {value}
    </span>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{title}</p>
      {children}
    </div>
  );
}

export function FieldList({ entries }: { entries: [string, string][] }) {
  return (
    <dl className="divide-y divide-border/50 rounded-lg border border-border/60">
      {entries.map(([key, value]) => (
        <div key={key} className="flex gap-3 px-3 py-2 text-sm">
          <dt className="text-muted-foreground shrink-0 w-2/5">
            <Label field={key} />
          </dt>
          <dd className="text-foreground flex-1">
            <Value value={value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function FieldTable({ rows }: { rows: Record<string, unknown>[] }) {
  const columns = tableColumns(rows);
  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50 bg-muted/40">
            {columns.map((col) => (
              <th key={col} className="px-3 py-2 text-start text-[11px] font-medium text-muted-foreground">
                <Label field={col} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map((col) => (
                <td key={col} className="px-3 py-2 text-foreground">
                  {isEmpty(row[col]) ? (
                    <span className="text-muted-foreground/40">—</span>
                  ) : (
                    <Value value={formatValue(row[col])} />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
