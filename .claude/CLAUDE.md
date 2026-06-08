# Sara — Claude Code Local Config

# Claude Code Project Instructions - Mortgage AI Agent ("Sara")

Welcome, Claude! You are an autonomous senior developer and AI engineer working on "Sara" - an AI-driven assistant for a mortgage consultant. Your goal is to help build, debug, and maintain this system efficiently while adhering to strict architectural patterns and cost-saving guidelines.

---

##  System Architecture & Stack

- **Backend:** Node.js / TypeScript (Express)
- **Frontend / Client UI:** React/Vite with **Tailwind CSS v3** + **shadcn/ui** component library. All new UI must use shadcn components from `src/components/ui/` and Tailwind utility classes. No custom CSS outside of `index.css` (which holds only Tailwind directives and CSS variable tokens).
- **UI Path Alias:** The client uses `@/` as an alias for `src/` (e.g. `import { Button } from "@/components/ui/button"`).
- **Database:** **MongoDB Atlas** accessed via the **Mongoose** ODM. Schemas/models live in `backend/src/models/` (e.g. `Client.ts`); the connection is initialized once at startup by `backend/src/config/db.ts` (`connectDB()`) using `process.env.MONGO_URI`. The legacy local `db.json` + `dbService.ts` layer has been retired.
- **File Storage:** Local persistent directory (`/uploads/[client_id]/`) for physical PDFs (Paystubs, Bank Statements).

---

##  Coding Standards & Rules

1. **Keep it Simple (YAGNI):** Do not over-engineer. Focus on clean, minimal code that achieves the MVP goals.
   - **File Size Limit:** If a component or file exceeds 150 lines, extract logic into separate files (e.g., custom hooks, helper functions, sub-components).
2. **Data Access (Mongoose):** All persistence goes through Mongoose models from `backend/src/models/`. Route handlers call the models directly (`Model.find()`, `Model.create()`, `Model.findOneAndUpdate()`, etc.) with `async/await` and error handling. Never read/write data files with `fs`. Records use a UUID string `id` field as the public key (not Mongo's `_id`), so query with `findOne({ id })`.
3. **TypeScript Strictly Typed:** Ensure all JSON structures match strictly defined types/interfaces. Use `Zod` for runtime validation if available.
4. **Structured LLM Outputs:** When writing endpoints that call Claude/OpenAI APIs for data extraction, always enforce strict JSON outputs.
5. **Separation of Concerns:** Keep Client logic and Backend logic strictly separated. The client is a dumb interface; all "brains", data parsing, and tool execution happen on the Backend.

---

##  Security & Privacy Guardrails

- **Sensitive Data:** This app handles highly confidential financial data (ID cards, bank statements, salaries). 
- **API Keys Protection:** Never hardcode API keys or credentials. Always use environment variables (`.env`).
- **Data Anonymization:** In test files or mocks, always use fake names and blurred financial details.

---

##  Critical Cost-Saving Guidelines (Budget Control)

To prevent excessive API spending during development via Claude Code, you **MUST** follow these rules:

1. **Respect `.gitignore`:** Never scan, index, or read files inside `node_modules`, `.venv`, `dist`, or `build` folders.
2. **Context Economy:** When asked to fix a bug or add a feature, only read the specific files involved. Do not read the entire codebase unless explicitly instructed.
3. **No Hallucinated Package Installs:** Do not install random npm/python packages without verifying they are absolutely necessary and lightweight.
4. **Be Concise:** Keep your explanations in the terminal short and focused. Write the code, run the test, and output the result.

---

##  Current Phase Roadmap

1. **Phase 1 (Done):** MongoDB/Mongoose data layer, Express file upload endpoints, and the initial prompt to extract metadata from PDFs (Client Name, Net Salary, Bank Status).
2. **Phase 2:** Implementing "Global Chat" endpoint to allow querying all clients in MongoDB at once.
3. **Phase 3:** Adding Function Calling (Tools) to make the agent autonomous (e.g., sending automated WhatsApp follow-ups for missing documents).

---

Let's build something amazing! Whenever you are ready to write code,  Before starting any task, read ONLY the files directly relevant to that task.

6. **Language Separation:** All user-facing text, messages, and UI labels must be written in Hebrew. All code naming (variables, functions, classes, file names, API routes, comments in code) must be in English only.

## Commands
See [`.claude/commands/`](./commands/) for all slash commands.

| File | Command | Description |
|------|---------|-------------|
| [`commit.md`](./commands/commit.md) | `/commit` | Stage and create a conventional commit |

## Skills
See [`.claude/skills/`](./skills/) for all skills.

| Folder | Trigger | Description |
|--------|---------|-------------|
| [`cr/`](./skills/cr/SKILL.md) | `cr`, `code review`, `review PR/commit` | Code review on commits or PRs |
