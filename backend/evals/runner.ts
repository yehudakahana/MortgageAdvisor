// Eval entry point. Run with `npm run eval` from the repo root.
//
//   --repeats=N        attempts per case (default 3 — the adapters expose no
//                      temperature, so inconsistency is measured instead)
//   --holdout          run ONLY the held-out cases
//   --category=NAME    limit chat to one category
//   --only=chat|extraction
//   --limit=N          first N cases of each suite (smoke runs)

import "./env";

import fs from "fs";
import path from "path";
import { TASK_MODEL_MAP } from "../src/config/llmModels";
import { ensureDocs } from "./fixtures/buildDocs";
import { JUDGE_MODEL, assertJudgeIsIndependent } from "./lib/judge";
import { printChatReport, printExtractionReport, writeResults } from "./lib/report";
import { runChatCase } from "./lib/runChat";
import { runExtractionCase } from "./lib/runExtraction";
import { ChatCase, ChatCaseResult, EvalRun, ExtractionCase, ExtractionCaseResult } from "./lib/types";

const CASES_DIR = path.resolve(__dirname, "cases");
const DOCS_DIR = path.resolve(__dirname, "fixtures/docs");
const RESULTS_DIR = path.resolve(__dirname, "results");

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const option = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];

const repeats = Number(option("repeats") ?? 3);
const holdoutOnly = flag("holdout");
const category = option("category");
const only = option("only");
const limit = option("limit") ? Number(option("limit")) : undefined;

function load<T>(file: string): T[] {
  return JSON.parse(fs.readFileSync(path.join(CASES_DIR, file), "utf8")) as T[];
}

// 20% of the suite is held out so prompts are never tuned against the reported
// numbers. The default run excludes them; --holdout runs only them.
function selectHoldout<T extends { holdout?: boolean }>(cases: T[]): T[] {
  return cases.filter((c) => (c.holdout === true) === holdoutOnly);
}

// --limit applies last, so it never silently empties a --category selection.
const applyLimit = <T>(cases: T[]): T[] => (limit ? cases.slice(0, limit) : cases);

async function main(): Promise<void> {
  const startedAt = new Date().toISOString();

  const allChat = load<ChatCase>("chat.json");
  const allExtraction = load<ExtractionCase>("extraction.json");

  const scopedChat = selectHoldout(allChat).filter((c) => !category || c.category === category);
  const chatCases = only === "extraction" ? [] : applyLimit(scopedChat);
  const extractionCases = only === "chat" ? [] : applyLimit(selectHoldout(allExtraction));

  const holdoutCount = [...allChat, ...allExtraction].filter((c) => c.holdout === true).length;

  if (chatCases.some((c) => c.expected.mode === "judge")) assertJudgeIsIndependent();
  if (extractionCases.length) ensureDocs(DOCS_DIR);

  console.log(
    [
      `chat model:       ${TASK_MODEL_MAP.CHAT.provider}/${TASK_MODEL_MAP.CHAT.model}`,
      `extraction model: ${TASK_MODEL_MAP.EXTRACTION.provider}/${TASK_MODEL_MAP.EXTRACTION.model}`,
      `judge model:      ${JUDGE_MODEL}`,
      `repeats:          ${repeats}`,
      `selection:        ${holdoutOnly ? "HOLDOUT ONLY" : `${holdoutCount} holdout case(s) excluded`}`,
      `running:          ${chatCases.length} chat, ${extractionCases.length} extraction`,
    ].join("\n")
  );

  // Progress lines end with the Hebrew question / filename and pad nothing after
  // it — RTL text inside a padded column scrambles alignment in most terminals.
  const extraction: ExtractionCaseResult[] = [];
  if (extractionCases.length) console.log(`\nEXTRACTION — ${extractionCases.length} documents`);
  for (const [i, c] of extractionCases.entries()) {
    process.stdout.write(`  ${String(i + 1).padStart(2)}/${extractionCases.length}  ${c.id}  `);
    const result = await runExtractionCase(c, DOCS_DIR, repeats);
    const total = c.fields.length;
    const hits = Object.values(result.fields).filter((f) => f.outcome === "hit").length;
    const verdict = result.error ? "ERROR" : `${hits}/${total} fields`;
    console.log(`${verdict.padEnd(14)}  ${c.doc}${result.error ? ` — ${result.error}` : ""}`);
    extraction.push(result);
  }

  const chat: ChatCaseResult[] = [];
  if (chatCases.length) console.log(`\nCHAT — ${chatCases.length} cases`);
  for (const [i, c] of chatCases.entries()) {
    process.stdout.write(`  ${String(i + 1).padStart(2)}/${chatCases.length}  ${c.id}  `);
    const result = await runChatCase(c, repeats);
    const verdict = result.outcome === "pass" ? "pass" : result.outcome.toUpperCase();
    const shaky = result.inconsistent ? " (unstable)" : "";
    console.log(`${(verdict + shaky).padEnd(14)}  ${c.category.padEnd(12)}  ${c.input.split("\n")[0]}`);
    chat.push(result);
  }

  if (extraction.length) printExtractionReport(extraction);
  if (chat.length) printChatReport(chat);

  const run: EvalRun = {
    startedAt,
    finishedAt: new Date().toISOString(),
    repeats,
    includedHoldout: holdoutOnly,
    chatModel: TASK_MODEL_MAP.CHAT.model,
    extractionModel: TASK_MODEL_MAP.EXTRACTION.model,
    judgeModel: JUDGE_MODEL,
    chat,
    extraction,
  };
  console.log(`\nresults: ${writeResults(run, RESULTS_DIR)}`);

  // Failing cases are data, not a broken harness — only harness/API errors
  // set a non-zero exit code.
  const errored = chat.filter((c) => c.outcome === "error").length + extraction.filter((e) => e.error).length;
  if (errored) {
    console.error(`\n${errored} case(s) errored (API or harness failure, not a score).`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
