# Eval suite

Measures the LLM parts of kay.ai against a hand-labeled ground truth. Makes
**real API calls** — it is not part of `npm test`, and `npm test` still blocks
all outbound network traffic.

```bash
npm run eval                          # default run (holdout excluded)
npm run eval -- --only=extraction     # one suite
npm run eval -- --category=unanswerable
npm run eval -- --repeats=1 --limit=3 # cheap smoke run
npm run eval -- --holdout             # ONLY the held-out cases
```

## What it measures

**EXTRACTION** — per-field accuracy against labeled fixtures. Reported per field
(`name`, `amount`, `interestRate`, `trackType`, `date`, `absentField`). There is
deliberately no average across fields.

**CHAT** — scored per category, never pooled:

| Category | Requirement |
|---|---|
| `answerable` | the value is in the documents; must return it |
| `unanswerable` | the value is NOT in the documents; must return the exact Hebrew fallback. **The headline anti-hallucination metric.** |
| `adversarial` | prompt injection, out-of-scope legal/investment advice, another user's data; must not comply |

## How it hits the real code

No prompt logic is reimplemented. The runner calls the same service functions
the routes call:

- chat → `buildClientData(clients)` + `routeToLLM("CHAT", …)` — identical to
  `src/routes/chat.ts`, minus guest caps and the Mongo load
- extraction → `extractFromBuffer(buffer, mimeType)` — identical to the upload
  and re-extract controllers

Nothing imports `config/db.ts`, and `evals/env.ts` deletes `MONGO_URI` after
loading `.env`, so the suite cannot reach production data. Clients are in-memory
fixtures; documents are generated PDFs.

## Scoring

Programmatic assertions are the default: numeric match, substring match, and an
exact match on `CHAT_FALLBACK_REPLY` (imported from `src/services/llm/prompts.ts`,
never duplicated). The unanswerable and adversarial categories are scored
**entirely without the judge**, so the most important number is deterministic.

The judge (`claude-opus-5`, overridable via `EVAL_JUDGE_MODEL`) runs only on
`mode: "judge"` cases where no assertion can express correctness — currently two
answerable cases. It is a different model from the one under test, and the runner
refuses to start if that stops being true. Its output shape is pinned by a JSON
schema; the ground truth lives in the case's `rubric`, so the judge never sees
the client data.

**Temperature:** the adapters expose no temperature parameter, so every case runs
3× and disagreement across runs is reported as its own `INCONSIST` column rather
than being hidden by a single sample. Use `--repeats=1` only for smoke runs.

## Known limitation: extraction field identity

`EXTRACTION_PROMPT` asks for `structuredFields` with keys the model chooses
itself. There is no fixed schema, so a field is matched by searching the whole
structure for a key whose normalized name is in the case's `aliases` list
(`net_salary` === `netSalary`). Consequences:

- a hit means the expected value appeared under *some* matching key, not
  necessarily the right one
- `key_not_found` often means the model named the key something unforeseen, not
  that it failed to read the document. Where that happens, `found` records
  `"value present under an unmatched key"` — a diagnostic that deliberately does
  **not** improve the score

The real fix is to give extraction a fixed output schema. Until then, read
`interestRate` and `trackType` accuracy as a lower bound.

## Adding cases

Cases are data, not code: `cases/chat.json` and `cases/extraction.json`. Every
case carries a `note` explaining why it is in the suite. Set `"holdout": true`
to keep a case out of the default run — 20% of the suite is held out so prompts
are never tuned against the reported numbers.

Fixture documents are generated into `fixtures/docs/` from `fixtures/docContent.ts`
on first run. Content is ASCII because embedding Hebrew in a raw PDF needs font
embedding (a new dependency). To use a real Hebrew document instead, drop a PDF
into `fixtures/docs/` under the case's `doc` filename — existing files are never
overwritten.

## Output

A per-category table and a per-field table on the console, plus a timestamped
JSON in `results/` (gitignored) holding every raw answer and the raw extraction
output, so runs can be diffed and re-scored without spending the calls again.

Exit code is non-zero only when cases **errored** (API or harness failure).
Failing cases are the measurement, not a broken run.
