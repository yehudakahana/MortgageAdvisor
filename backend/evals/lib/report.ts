// Console tables + a timestamped JSON artifact. Scores are always reported per
// category and per field — there is deliberately no pooled headline number.

import fs from "fs";
import path from "path";
import { ChatCaseResult, EvalRun, ExtractionCaseResult, FieldOutcome } from "./types";

const pct = (n: number, total: number) => (total === 0 ? "-" : `${Math.round((n / total) * 100)}%`);

function table(headers: string[], rows: string[][]): string {
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const line = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i])).join("  ");
  return [line(headers), widths.map((w) => "-".repeat(w)).join("  "), ...rows.map(line)].join("\n");
}

export function printChatReport(results: ChatCaseResult[]): void {
  const categories = ["answerable", "unanswerable", "adversarial"] as const;
  const rows = categories.map((category) => {
    const set = results.filter((r) => r.category === category);
    const pass = set.filter((r) => r.outcome === "pass").length;
    const fail = set.filter((r) => r.outcome === "fail").length;
    const error = set.filter((r) => r.outcome === "error").length;
    const shaky = set.filter((r) => r.inconsistent).length;
    return [
      category,
      String(set.length),
      String(pass),
      String(fail),
      String(error),
      pct(pass, set.length),
      pct(shaky, set.length),
    ];
  });

  console.log("\nCHAT");
  console.log(table(["CATEGORY", "N", "PASS", "FAIL", "ERR", "SCORE", "INCONSIST"], rows));

  const bad = results.filter((r) => r.outcome !== "pass");
  if (bad.length) {
    console.log("\n  failing chat cases:");
    for (const r of bad) console.log(`  - ${r.id} [${r.outcome}] ${r.attempts[0]?.reason ?? ""}`);
  }
}

const FIELD_KEYS: FieldOutcome[] = ["hit", "wrong_value", "key_not_found", "null_returned"];

export function printExtractionReport(results: ExtractionCaseResult[]): void {
  const perField = new Map<string, Record<FieldOutcome, number> & { n: number; shaky: number }>();

  for (const result of results) {
    for (const [field, { outcome, inconsistent }] of Object.entries(result.fields)) {
      const entry =
        perField.get(field) ??
        ({ hit: 0, wrong_value: 0, key_not_found: 0, null_returned: 0, n: 0, shaky: 0 } as never);
      entry[outcome] += 1;
      entry.n += 1;
      if (inconsistent) entry.shaky += 1;
      perField.set(field, entry);
    }
  }

  const rows = [...perField.entries()].map(([field, s]) => [
    field,
    String(s.n),
    ...FIELD_KEYS.map((k) => String(s[k])),
    pct(s.hit, s.n),
    pct(s.shaky, s.n),
  ]);

  console.log("\nEXTRACTION (per field — no average across fields)");
  console.log(
    table(["FIELD", "N", "HIT", "WRONG", "NO KEY", "NULL", "ACCURACY", "INCONSIST"], rows)
  );

  const broken = results.filter((r) => r.error);
  if (broken.length) {
    console.log("\n  extraction cases that errored:");
    for (const r of broken) console.log(`  - ${r.id}: ${r.error}`);
  }
}

export function writeResults(run: EvalRun, dir: string): string {
  fs.mkdirSync(dir, { recursive: true });
  const stamp = run.startedAt.replace(/[:.]/g, "-");
  const file = path.join(dir, `${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(run, null, 2), "utf8");
  return file;
}
