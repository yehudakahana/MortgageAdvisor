/**
 * PostToolUse guard: user-facing Hebrew text must live in the shared string
 * modules, not inline in components or route handlers (CLAUDE.md rule 6).
 *
 * Reads the hook payload on stdin, scans the edited file for Hebrew characters,
 * and injects a reminder back into the model's context when it finds any.
 * Never blocks the edit — it only reports.
 */
const fs = require("fs");

const HEBREW = /[\u0590-\u05FF]/;

// Files whose whole job is holding Hebrew text, plus tests and fixtures.
const ALLOWED = [
  /client[\\/]src[\\/]lib[\\/]strings\.ts$/,
  /client[\\/]src[\\/]lib[\\/]documentFields\.ts$/,
  /client[\\/]src[\\/]types[\\/]client\.ts$/,
  /backend[\\/]src[\\/]constants[\\/]messages\.ts$/,
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /[\\/]test[\\/]/,
];

const SCANNED = /(client|backend)[\\/]src[\\/].*\.[jt]sx?$/;

function read(stream) {
  return new Promise((resolve) => {
    let data = "";
    stream.on("data", (chunk) => (data += chunk));
    stream.on("end", () => resolve(data));
  });
}

function isComment(line) {
  const t = line.trim();
  return t.startsWith("//") || t.startsWith("*") || t.startsWith("/*");
}

// Only quoted literals and JSX text count. A Hebrew character range inside a
// regex (used to detect Hebrew server errors) is not a hardcoded string.
const LITERAL = /"[^"\n]*"|'[^'\n]*'|`[^`\n]*`|>[^<>{}\n]+</g;

function hasHebrewLiteral(line) {
  const matches = line.match(LITERAL);
  return matches ? matches.some((m) => HEBREW.test(m)) : false;
}

async function main() {
  const raw = await read(process.stdin);
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return;
  }

  const file =
    payload?.tool_response?.filePath ?? payload?.tool_input?.file_path ?? "";
  if (!file || !SCANNED.test(file)) return;
  if (ALLOWED.some((pattern) => pattern.test(file))) return;

  let content;
  try {
    content = fs.readFileSync(file, "utf8");
  } catch {
    return;
  }

  const hits = content
    .split("\n")
    .map((line, index) => ({ line: index + 1, text: line }))
    .filter(({ text }) => hasHebrewLiteral(text) && !isComment(text))
    .slice(0, 10);

  if (hits.length === 0) return;

  const target = file.includes("backend")
    ? "backend/src/constants/messages.ts"
    : "client/src/lib/strings.ts";
  const list = hits
    .map(({ line, text }) => `  L${line}: ${text.trim().slice(0, 90)}`)
    .join("\n");

  process.stdout.write(
    JSON.stringify({
      suppressOutput: true,
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext:
          `Hardcoded Hebrew text found in ${file} (CLAUDE.md rule 6: ` +
          `user-facing strings belong in ${target}, referenced by key):\n${list}\n` +
          `Move these into ${target} before finishing the task.`,
      },
    })
  );
}

main();
