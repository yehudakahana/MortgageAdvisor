#!/usr/bin/env node
/**
 * Pre-commit secrets audit. Checks what git would ACTUALLY commit — not the
 * whole disk — so it stays fast and only reports things you are about to push.
 *
 *   npm run audit:secrets          uncommitted + untracked files (default)
 *   npm run audit:secrets -- --all every tracked file in the repo
 *
 * Exits 1 on any finding so it can gate a commit.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const scanAll = process.argv.includes("--all");

// Paths that must never reach a commit, regardless of content.
const FORBIDDEN_PATHS = [
  { name: "environment file", re: /(^|\/)\.env(\.|$)/ },
  { name: "eval run artifact (may contain model output)", re: /\/evals\/results\/.+\.json$/ },
  { name: "private key / certificate", re: /\.(pem|key|p12|pfx|jks)$/i },
  { name: "local database dump", re: /(^|\/)db\.json$/ },
];

// Secret-shaped content. Deliberately narrow — a noisy audit gets ignored.
const SECRET_PATTERNS = [
  { name: "Anthropic API key", re: /sk-ant-[A-Za-z0-9_-]{20,}/ },
  { name: "Google/Gemini API key", re: /AIza[A-Za-z0-9_-]{30,}/ },
  { name: "OpenAI API key", re: /\bsk-[A-Za-z0-9]{32,}\b/ },
  { name: "AWS access key id", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "connection string with password", re: /\b\w+:\/\/[^\s:/]+:[^\s@/]+@/ },
  { name: "JWT", re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  {
    name: "hardcoded credential assignment",
    // Skips ${...} interpolation and process.env references.
    re: /(api[_-]?key|secret|passwd|password|auth[_-]?token)["']?\s*[:=]\s*["'](?!\$\{|process\.)[^"']{8,}["']/i,
  },
];

const BINARY = /\.(pdf|png|jpe?g|gif|webp|ico|zip|gz|woff2?|ttf|otf|mp4|xlsx?|docx?)$/i;

// Known-benign matches. Kept deliberately narrow and reported as a count, so
// suppressions stay visible instead of quietly hiding a real leak. `rule: "*"`
// exempts a path entirely; naming a rule exempts only that one.
const ALLOWLIST = [
  // Committed templates: placeholder values by design.
  { path: /\.env\.example$/, rule: "*" },
  // Public by design — this URL is baked into the client bundle at build time.
  { path: /^\/client\/\.env\.production$/, rule: "forbidden path: environment file" },
  // Intentional dummy credentials. Real-key patterns are NOT exempt here.
  { path: /(\.test\.[jt]sx?|\/test\/[^/]+)$/, rule: "hardcoded credential assignment" },
];

let suppressed = 0;

function allowed(file, rule) {
  const normalized = `/${file.replace(/\\/g, "/")}`;
  const hit = ALLOWLIST.some((a) => a.path.test(normalized) && (a.rule === "*" || a.rule === rule));
  if (hit) suppressed += 1;
  return hit;
}

function git(args) {
  return execSync(`git ${args}`, { cwd: ROOT, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
}

// `git add -An` is a dry run: it stages nothing and prints what it would add.
function filesToCheck() {
  if (scanAll) return git("ls-files").split("\n").filter(Boolean);
  return git("add -An .")
    .split("\n")
    .map((line) => line.match(/^add '(.+)'$/)?.[1])
    .filter(Boolean);
}

const findings = [];

function scanContent(file) {
  if (BINARY.test(file)) return;
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full) || fs.statSync(full).size > 2 * 1024 * 1024) return;

  const lines = fs.readFileSync(full, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const { name, re } of SECRET_PATTERNS) {
      if (re.test(line) && !allowed(file, name)) {
        findings.push({ file, line: i + 1, name, excerpt: line.trim().slice(0, 90) });
      }
    }
  });
}

const files = filesToCheck();

for (const file of files) {
  const normalized = `/${file.replace(/\\/g, "/")}`;
  for (const { name, re } of FORBIDDEN_PATHS) {
    const rule = `forbidden path: ${name}`;
    if (re.test(normalized) && !allowed(file, rule)) findings.push({ file, line: 0, name: rule });
  }
  scanContent(file);
}

const scope = scanAll ? "tracked files" : "files git would commit";
const note = suppressed ? ` (${suppressed} allowlisted match(es) suppressed)` : "";
console.log(`scanned ${files.length} ${scope}${note}\n`);

if (findings.length === 0) {
  console.log("no secrets or forbidden paths found.");
  process.exit(0);
}

for (const f of findings) {
  console.error(`  ${f.file}${f.line ? `:${f.line}` : ""}  ${f.name}`);
  if (f.excerpt) console.error(`      ${f.excerpt}`);
}
console.error(`\n${findings.length} finding(s). Nothing was staged — resolve these before committing.`);
process.exit(1);
