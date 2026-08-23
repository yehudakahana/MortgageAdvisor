// LLM-as-judge, used ONLY for open-ended answers that no assertion can express.
// The judge is deliberately a different model from the one under test, and is
// given the ground truth inside the rubric rather than the raw client data —
// that keeps the judge prompt small, focused, and cheap.

import Anthropic from "@anthropic-ai/sdk";
import { TASK_MODEL_MAP, TASK_FALLBACK_MAP } from "../../src/config/llmModels";
import { Outcome } from "./types";

export const JUDGE_MODEL = process.env.EVAL_JUDGE_MODEL ?? "claude-opus-5";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const JUDGE_SYSTEM = `You grade a single answer produced by a Hebrew-language mortgage assistant.

Apply ONLY the rubric you are given. Ignore fluency, politeness, formatting and extra detail.
An answer that asserts anything the rubric does not license is a FAIL, even when it sounds plausible.
An answer that hedges but still delivers the required content is a PASS.

Give the verdict and a single short line of reasoning, at most 15 words.`;

// Hard guarantee on the judge's output shape, so a malformed verdict cannot be
// mistaken for a grade. Kept as a raw JSON schema — zod is not a project dep.
const VERDICT_SCHEMA = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: ["pass", "fail"] },
    reason: { type: "string" },
  },
  required: ["verdict", "reason"],
  additionalProperties: false,
} as const;

export interface JudgeVerdict {
  outcome: Outcome;
  reason: string;
}

// A judge that shares a model with the system under test grades its own output,
// so this is enforced rather than documented.
export function assertJudgeIsIndependent(): void {
  const underTest = [TASK_MODEL_MAP.CHAT.model, TASK_FALLBACK_MAP.CHAT?.model].filter(Boolean);
  if (underTest.includes(JUDGE_MODEL)) {
    throw new Error(
      `[eval] judge model ${JUDGE_MODEL} is also under test (${underTest.join(", ")}). ` +
        `Set EVAL_JUDGE_MODEL to a different model.`
    );
  }
}

function parseVerdict(raw: string): JudgeVerdict {
  const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const parsed = JSON.parse(stripped) as { verdict?: unknown; reason?: unknown };
  if (parsed.verdict !== "pass" && parsed.verdict !== "fail") {
    throw new Error(`unexpected verdict: ${String(parsed.verdict)}`);
  }
  return {
    outcome: parsed.verdict,
    reason: typeof parsed.reason === "string" ? parsed.reason : "",
  };
}

export async function judge(
  rubric: string,
  question: string,
  answer: string
): Promise<JudgeVerdict> {
  try {
    const response = await client.messages.create({
      model: JUDGE_MODEL,
      max_tokens: 2048,
      // Opus-family models reject `temperature`; determinism comes from the
      // narrow rubric and the fixed output shape instead.
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: VERDICT_SCHEMA },
      },
      system: JUDGE_SYSTEM,
      messages: [
        {
          role: "user",
          content: `RUBRIC:\n${rubric}\n\nQUESTION ASKED:\n${question}\n\nANSWER TO GRADE:\n${answer}`,
        },
      ],
    });
    const block = response.content.find((block) => block.type === "text");
    if (block?.type !== "text") throw new Error("judge returned no text block");
    return parseVerdict(block.text);
  } catch (err) {
    // A broken judge must never silently look like a passing case.
    return { outcome: "error", reason: `judge failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}
