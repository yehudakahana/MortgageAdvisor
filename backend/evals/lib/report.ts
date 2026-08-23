// Console tables + a timestamped JSON artifact. Scores are always reported per
// category and per field — there is deliberately no pooled headline number.
//
// Headers stay English (developer tooling, CLAUDE.md rule 6) but every table
// carries a legend, so no column needs prior knowledge to read.

import fs from "fs";
import path from "path";
import { ChatCaseResult, EvalRun, ExtractionCaseResult, FieldOutcome } from "./types";

const pct = (n: number, total: number) => (total === 0 ? "-" : `${Math.round((n / total) * 100)}%`);

function table(headers: string[], rows: string[][], legend: string[]): string {
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const line = (cells: string[]) =>
    "  " + cells.map((c, i) => (i === 0 ? c.padEnd(widths[i]) : c.padStart(widths[i]))).join("   ");
  return [
    line(headers),
    "  " + widths.map((w) => "-".repeat(w)).join("---"),
    ...rows.map(line),
    "",
    ...legend.map((l) => `  ${l}`),
  ].join("\n");
}

export function printChatReport(results: ChatCaseResult[]): void {
  const categories = ["answerable", "unanswerable", "adversarial"] as const;
  const rows = categories.map((category) => {
    const set = results.filter((r) => r.category === category);
    const pass = set.filter((r) => r.outcome === "pass").length;
    const fail = set.filter((r) => r.outcome === "fail").length;
    const error = set.filter((r) => r.outcome === "error").length;
    const shaky = set.filter((r) => r.inconsistent).length;
    // Errors are API failures, not model mistakes, so they are excluded from
    // the score rather than counted as failures.
    return [
      category,
      String(set.length),
      String(pass),
      String(fail),
      String(error),
      pct(pass, set.length - error),
      pct(shaky, set.length),
    ];
  });

  console.log("\nCHAT — scored per category, never pooled\n");
  console.log(
    table(["CATEGORY", "CASES", "PASS", "FAIL", "ERROR", "SCORE", "UNSTABLE"], rows, [
      "PASS      the model did what the category requires",
      "FAIL      it answered, but wrongly (for unanswerable: it did not refuse)",
      "ERROR     the API call itself failed — not a model mistake",
      "SCORE     PASS out of the cases that actually ran (ERROR excluded)",
      "UNSTABLE  share of cases where the 3 repeats disagreed with each other",
    ])
  );

  const bad = results.filter((r) => r.outcome !== "pass");
  if (bad.length) {
    console.log("\n  cases that did not pass:");
    for (const r of bad) {
      const reason = r.attempts.find((a) => a.outcome === r.outcome)?.reason ?? "";
      console.log(`  - ${r.id} [${r.outcome}] ${reason}`);
    }
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

  console.log("\nEXTRACTION — accuracy per field, deliberately no average across fields\n");
  console.log(
    table(["FIELD", "DOCS", "OK", "WRONG", "NO KEY", "NULL", "ACCURACY", "UNSTABLE"], rows, [
      "DOCS      documents in which this field was labeled",
      "OK        the extracted value matched the ground truth",
      "WRONG     a value came back, but the wrong one",
      "NO KEY    no key matched — usually the model named the key something else,",
      "          not that it misread the document (see README)",
      "NULL      the field came back empty",
      "ACCURACY  OK out of DOCS",
      "UNSTABLE  share of fields where the 3 repeats disagreed with each other",
      "",
      'absentField is inverted on purpose: the document has NO such value, so',
      '"OK" there means the model correctly refused to invent one.',
    ])
  );

  const broken = results.filter((r) => r.error);
  if (broken.length) {
    console.log("\n  documents that errored:");
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
