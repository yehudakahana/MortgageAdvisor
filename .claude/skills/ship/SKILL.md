---
name: ship
description: This skill should be used when the user says "ship", "ship it", "ready for pr", "make it ready for pr", "fix all and commit", "cr fix commit push", or otherwise asks to take the current branch from "code is written" to "PR is open". Runs the full review → fix → verify → commit → push → PR chain in one pass.
version: 1.0.0
---

# Ship Skill (review → fix → verify → commit → push → PR)

This is the chain the user runs on **every** branch, previously as five separate
orders. Run it end to end without asking for permission between phases.

## Arguments

- No argument → full chain on the current branch.
- `--no-pr` → stop after push (no PR created).
- `--dry` → run phases 1–3 only (review + fix + verify), then report. No commit.

## Preconditions

Run these first. If any fails, report and stop:

1. `git branch --show-current` — if on `main`, stop and ask which branch name to create.
2. `git status --porcelain` — if empty AND the branch has no unpushed commits, stop: nothing to ship.

---

## Phase 1 — Review

Run the `cr` skill's review logic against `git diff main...HEAD` **plus** any
uncommitted working-tree changes. Do not print the full review yet — hold the
issue list for Phase 2.

## Phase 2 — Fix all

Fix every issue found in Phase 1. This is the "fix all" step the user asks for
every time, so it is automatic — do not ask which ones to fix.

- Fix CLAUDE.md violations, bugs, and security findings.
- Skip issues explicitly listed under "False Positives" in the `cr` skill.
- If a finding is genuinely ambiguous (two valid designs), fix nothing there and
  list it under "Left for you" in the final report.

## Phase 3 — Verify

Run in this order, from the repo root. Stop at the first failure, fix it, re-run:

```
npx tsc --noEmit -p backend/tsconfig.json
npx tsc --noEmit -p client/tsconfig.json
npm run test:be
npm run test:fe
```

E2E (`npm run test:offline`) only if the diff touched routes, auth, or upload flows.

If a test fails for a reason unrelated to this branch, say so explicitly in the
report instead of silently skipping it.

## Phase 4 — Commit

Follow `.claude/commands/commit.md` exactly: conventional commit, English
subject ≤72 chars, correct type + scope, never stage `.env`, `node_modules/`,
`dist/`, `build/`, `playwright-report/`, or `test-results/`.

## Phase 5 — Push

`git push -u origin <current-branch>`

## Phase 6 — PR

  - If `gh` is not installed (`gh not found`), skip the API calls: print the
    compare URL `https://github.com/yehudakahana/MortageAdvisor/compare/<branch>?expand=1`
    and the full PR body in the report so it can be pasted into the browser.
    Report the PR as "not created" — do not treat this as a failure of the branch.
  - If a PR already exists for this branch (`gh pr view --json number,url`), do not
    create a new one — update its body instead with `gh pr edit --body`.
  - Otherwise `gh pr create --base main`.
  - **Title:** same style as the commit subject (English, conventional).
  - **Body:** short, in the shape the user asks for every time — one line per change:

  ```
  ## What changed
  - <one row per change, English, imperative>

## Why
<1–2 sentences>

## Verified
- tsc: backend + client clean
- unit: <N> backend / <N> client passing
- e2e: <ran | skipped, no route changes>
```

Do not pad the body. If there are 3 changes, write 3 rows.

---

## Final Report

Print exactly this, nothing more:

```
### Shipped

**Branch:** <name> → PR <url or "not created">

**Fixed:** <N> issues
1. <one row each>

**Verified:** tsc ✓ · be <N> ✓ · fe <N> ✓ · e2e <ran/skipped>

**Left for you:** <only if something was ambiguous, else omit this line>
```

## Rules

- Never merge to `main`. Opening the PR is where this skill stops.
- Never `--force` push.
- If the branch has conflicts with `main`, rebase onto `origin/main` before
  Phase 5, resolve them, and say so in the report.
- Do not narrate between phases. One report at the end.
