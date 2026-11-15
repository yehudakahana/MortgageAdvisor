# Custom Rules

Advisors define their own rules that shape how kay.ai behaves. There are two
kinds, set in **Settings → Custom rules** (two tabs). Rules are per-advisor and
stored on the user record (`customKnowledge`, with a `category` field).

## Chat rules (`category: "chat"`)

Guidance injected into קאיה's chat system prompt. They steer how she answers —
tone, what to always mention, formatting preferences. They take effect from the
next chat message.

Example: *"תמיד לציין את המסלול המומלץ בתחילת התשובה."*

- Apply to both per-client chat (`/api/chat/client`) and global chat
  (`/api/chat/global`).
- Take priority over קאיה's general knowledge.
- Rules created before categories existed have no `category` and are treated as
  chat rules, so existing behaviour is unchanged.

## Document-validation rules (`category: "document_validation"`)

Checks run against a client's **uploaded documents**, not against chat. Each is
a free-text requirement the documents in a client's file must satisfy.

Example: *"חייב להיות תלוש שכר מ-3 החודשים האחרונים."*

### When they run

Validation runs **automatically** after a document upload, as the last stage of
the upload flow:

1. Documents upload.
2. Extraction runs in the background.
3. If — and only if — the advisor has at least one validation rule, the check
   runs. No validation rules means no check and no model call.
4. A report pops up: each rule marked **pass**, **fail**, or **uncertain**, with
   the evidence from the documents the verdict is based on.

The check can also be run on demand via `GET /api/validation/:clientId`, which
returns `{ skipped: true }` when the advisor has no validation rules.

### How the check works

- Runs on the already-extracted document text — one model call per check, not a
  re-read of the files.
- Uses the `VALIDATION` task in the LLM router. Defaults to Claude
  (`VALIDATION_PROVIDER` / `VALIDATION_MODEL` override it to Gemini); falls back
  to Gemini.
- **`uncertain` is a real outcome.** When the documents don't contain enough to
  decide, the model is instructed to answer `uncertain` rather than guess.
- The report is an **assistant check, not an authority** — it always shows the
  evidence so the advisor can verify against the source documents.

### Privacy

Validation sends only the client's already-extracted text and the advisor's
rules to the model. The report stores no document content beyond the short
evidence snippet shown per rule.
