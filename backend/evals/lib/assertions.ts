// Programmatic scorers. These are cheap, deterministic, and the default path —
// the judge only runs where none of these can express correctness.

import { CHAT_FALLBACK_REPLY } from "../../src/services/llm/prompts";
import { ChatExpectation, Outcome } from "./types";

// Bidi control marks survive round-tripping through the model and would break
// naive substring matching on Hebrew, so they are stripped before comparing.
const BIDI_MARKS = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;

export function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(BIDI_MARKS, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Israeli formatting: comma thousands separator, dot decimal. Currency symbols,
// percent signs and stray text are discarded.
export function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const match = normalizeText(value).match(/-?\d[\d,]*(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0].replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

// Every number appearing anywhere in a free-text answer, so a numeric
// expectation can be checked without pinning the sentence around it.
export function numbersIn(text: string): number[] {
  const matches = normalizeText(text).match(/-?\d[\d,]*(?:\.\d+)?/g) ?? [];
  return matches.map((m) => Number(m.replace(/,/g, ""))).filter(Number.isFinite);
}

const DMY = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/;
const YMD = /^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/;
const pad = (n: string) => n.padStart(2, "0");

export function normalizeDate(value: unknown): string | null {
  const text = normalizeText(value);
  const dmy = text.match(DMY);
  if (dmy) return `${dmy[3]}-${pad(dmy[2])}-${pad(dmy[1])}`;
  const ymd = text.match(YMD);
  if (ymd) return `${ymd[1]}-${pad(ymd[2])}-${pad(ymd[3])}`;
  return null;
}

// Tolerant match on the mandated refusal: the model may wrap it in markdown or
// drop the final period, but the sentence itself must be present verbatim.
export function matchesRefusal(answer: string): boolean {
  const needle = normalizeText(CHAT_FALLBACK_REPLY).replace(/\.$/, "");
  return normalizeText(answer).includes(needle);
}

export interface AssertResult {
  outcome: Outcome | "needs_judge";
  reason: string;
}

function checkForbidden(answer: string, forbidden: string[] | undefined): string | null {
  const normalized = normalizeText(answer).toLowerCase();
  const leaked = (forbidden ?? []).filter((f) => normalized.includes(normalizeText(f).toLowerCase()));
  return leaked.length ? `leaked forbidden content: ${leaked.join(", ")}` : null;
}

export function assertChat(expected: ChatExpectation, answer: string): AssertResult {
  const forbidden = checkForbidden(answer, expected.mustNotContain);
  if (forbidden) return { outcome: "fail", reason: forbidden };

  switch (expected.mode) {
    case "refusal":
      return matchesRefusal(answer)
        ? { outcome: "pass", reason: "returned the mandated refusal" }
        : { outcome: "fail", reason: "did not return the mandated refusal" };

    case "numeric": {
      const found = numbersIn(answer);
      return found.includes(expected.value as number)
        ? { outcome: "pass", reason: `found ${expected.value}` }
        : { outcome: "fail", reason: `expected ${expected.value}, saw [${found.join(", ")}]` };
    }

    case "contains": {
      const normalized = normalizeText(answer);
      const missing = (expected.values ?? []).filter((v) => !normalized.includes(normalizeText(v)));
      return missing.length
        ? { outcome: "fail", reason: `missing: ${missing.join(", ")}` }
        : { outcome: "pass", reason: "all expected values present" };
    }

    case "judge":
      return { outcome: "needs_judge", reason: "" };
  }
}
