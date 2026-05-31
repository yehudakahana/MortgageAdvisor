---
name: cr
description: This skill should be used when the user asks to "code review", "cr", "review a commit", "review a PR", "review pull request", "review my changes", or mentions reviewing recent git changes or a specific PR number.
version: 1.0.0
---

# Code Review Skill (Commits & PRs)

This skill performs a focused code review on recent commits or a GitHub pull request.

## When This Skill Applies

Activate when the user says any of:
- "cr", "code review", "review my changes"
- "review commit", "review last commit", "review these commits"
- "review PR", "review pull request", "review PR #123"

## Arguments

The user may pass an optional argument:
- **No argument** → review the diff of the current branch vs `main`
- **`<PR number>`** → review a specific GitHub pull request (e.g. `/cr 42`)
- **`<commit SHA>`** → review a specific commit (e.g. `/cr a1b2c3`)

## Steps

### Case A — PR number provided

1. Run `gh pr view <number>` to confirm the PR exists and is open.
2. Run `gh pr diff <number>` to fetch the full diff.
3. Run `gh pr view <number> --json title,body,author,baseRefName,headRefName` to get metadata.
4. Continue to the **Review** section below.

### Case B — Commit SHA provided

1. Run `git show <sha> --stat` to get the list of changed files.
2. Run `git show <sha>` to get the full diff.
3. Continue to the **Review** section below.

### Case C — No argument (current branch diff)

1. Run `git log main..HEAD --oneline` to list commits on this branch.
2. Run `git diff main...HEAD` to get the full diff against `main`.
3. Continue to the **Review** section below.

---

## Review

Once you have the diff, perform the following checks:

### 1. CLAUDE.md Compliance
- Read `CLAUDE.md` (already in context).
- Flag any violations: custom CSS outside `index.css`, direct `fs` usage in routes instead of `dbService.ts`, hardcoded API keys, UI text not in Hebrew, code identifiers not in English, missing Tailwind/shadcn usage where UI was changed.

### 2. Bug Hunt
- Scan for obvious bugs: null/undefined access, wrong async handling, missing error handling at system boundaries (user input, external APIs), type mismatches.
- Ignore issues a linter/TypeScript compiler would catch automatically.

### 3. Security Check
- Look for: hardcoded secrets, SQL/command injection risk, XSS, unvalidated user input reaching sensitive operations.

### 4. Simplicity Check
- Flag over-engineering, unnecessary abstractions, or added features beyond what the task required.

---

## Output Format

Print the review in this exact format:

---

### Code Review

**Scope:** `<branch vs main | PR #N | commit <sha>>`

**Files changed:** `<count>`

#### Issues Found

If issues exist, list them:

1. **[CLAUDE.md / Bug / Security / Simplicity]** — Brief description.
   > `path/to/file.ts:LINE` — relevant snippet or context.

2. ...

#### No issues found
_(if nothing was flagged)_

No significant issues. Changes look clean.

---

## False Positives — Do NOT flag

- Pre-existing issues not touched by this diff.
- TypeScript / ESLint errors (CI will catch these).
- Missing test coverage unless explicitly required.
- Style nitpicks not mentioned in `CLAUDE.md`.
- Intentional removals or refactors that are clearly part of the stated goal.

## Notes

- Keep the review concise. A senior engineer should read it in under 2 minutes.
- Always cite file + line number for each issue.
- Do not run the app or build process during review.
