// Drives the REAL chat service path: the same buildClientData + routeToLLM pair
// the /api/chat route calls. No prompt logic is reimplemented here, and nothing
// touches Mongo — buildClientData takes an in-memory Client[].

import { buildClientData } from "../../src/services/chatContext";
import { routeToLLM } from "../../src/services/llm/router";
import { ClientData } from "../../src/services/llm/types";
import { resolveFixture } from "../fixtures/clients";
import { assertChat } from "./assertions";
import { judge } from "./judge";
import { ChatAttempt, ChatCase, ChatCaseResult, Outcome } from "./types";

// On a tie, the more severe outcome wins — an eval should never round up.
const SEVERITY: Record<Outcome, number> = { error: 2, fail: 1, pass: 0 };

function majority(attempts: ChatAttempt[]): { outcome: Outcome; inconsistent: boolean } {
  const counts = new Map<Outcome, number>();
  for (const a of attempts) counts.set(a.outcome, (counts.get(a.outcome) ?? 0) + 1);
  const ranked = [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || SEVERITY[b[0]] - SEVERITY[a[0]]
  );
  return { outcome: ranked[0][0], inconsistent: counts.size > 1 };
}

async function runOnce(c: ChatCase, clientData: ClientData): Promise<ChatAttempt> {
  try {
    const { content, provider, model, usedFallback } = await routeToLLM("CHAT", {
      clientData,
      // Single-turn: conversation history is not what these cases measure.
      chatHistory: [],
      userMessage: c.input,
      // Matches the production path for an advisor with no custom rules.
      advisorRules: [],
    });

    const asserted = assertChat(c.expected, content);
    const base = { answer: content, provider, model, usedFallback };

    if (asserted.outcome !== "needs_judge") {
      return { ...base, outcome: asserted.outcome, reason: asserted.reason, judged: false };
    }

    const verdict = await judge(c.expected.rubric ?? "", c.input, content);
    return { ...base, outcome: verdict.outcome, reason: verdict.reason, judged: true };
  } catch (err) {
    return {
      outcome: "error",
      reason: err instanceof Error ? err.message : String(err),
      answer: "",
    };
  }
}

export async function runChatCase(c: ChatCase, repeats: number): Promise<ChatCaseResult> {
  const clientData = buildClientData(resolveFixture(c.fixture));
  const attempts: ChatAttempt[] = [];

  // Sequential on purpose: repeats share a cached system prefix, so running
  // them in parallel would miss the cache and cost more.
  for (let i = 0; i < repeats; i++) {
    attempts.push(await runOnce(c, clientData));
  }

  return {
    id: c.id,
    category: c.category,
    holdout: c.holdout === true,
    note: c.note,
    attempts,
    ...majority(attempts),
  };
}
