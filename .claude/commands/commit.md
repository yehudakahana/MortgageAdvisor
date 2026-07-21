---
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git commit:*)
description: Stage all changes and create a conventional commit for the kay.ai mortgage project
---

## Context

- Git status: !`git status`
- Staged and unstaged diff: !`git diff HEAD`
- Current branch: !`git branch --show-current`
- Recent commits (for style reference): !`git log --oneline -8`

## Your Task

1. Review the diff and determine the correct **Conventional Commit** type and scope:
   - **Types:** `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `test`
   - **Scopes:** `backend`, `client`, `db`, `api`, `ui`, `auth`, `upload`

2. Stage all relevant changed files with `git add`.
   - Never stage `.env`, `node_modules/`, `dist/`, or `build/` files.
   - Never stage files containing real financial data or credentials.

3. Create a single commit using this format:
   ```
   <type>(<scope>): <short English description, max 72 chars>
   ```

4. Do not write any explanatory text — only make the tool calls to stage and commit.
