import { describe, expect, it } from "vitest";
import {
  ADVISOR_RULES_HEADER,
  ADVISOR_RULES_PRIORITY_NOTE,
  CHAT_SYSTEM_PROMPT,
  buildAdvisorRulesBlock,
} from "./prompts";
import { buildCachedSystem } from "./claudeAdapter";

describe("buildAdvisorRulesBlock", () => {
  it("returns null when there are no usable rules", () => {
    expect(buildAdvisorRulesBlock(undefined)).toBeNull();
    expect(buildAdvisorRulesBlock([])).toBeNull();
    expect(buildAdvisorRulesBlock(["   ", "\n"])).toBeNull();
  });

  it("renders a numbered one-line-each list with header and priority note", () => {
    const block = buildAdvisorRulesBlock(["כלל ראשון", "כלל שני"]);
    expect(block).toContain(ADVISOR_RULES_HEADER);
    expect(block).toContain(ADVISOR_RULES_PRIORITY_NOTE);
    expect(block).toContain("1. כלל ראשון\n2. כלל שני");
  });

  it("flattens embedded newlines so a rule can never span lines", () => {
    const block = buildAdvisorRulesBlock(["שורה אחת\nשורה שנייה"]);
    expect(block).toContain("1. שורה אחת שורה שנייה");
  });
});

describe("buildCachedSystem", () => {
  const clientData = { structuredFields: { a: 1 }, rawText: "טקסט" };

  it("without rules: two blocks, cache breakpoint on the client-data block", () => {
    const blocks = buildCachedSystem(CHAT_SYSTEM_PROMPT, clientData);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].cache_control).toBeUndefined();
    expect(blocks[1].cache_control).toEqual({ type: "ephemeral" });
  });

  it("with rules: rules block is appended AFTER the cache breakpoint", () => {
    const blocks = buildCachedSystem(CHAT_SYSTEM_PROMPT, clientData, ["כלל אחד"]);
    expect(blocks).toHaveLength(3);
    // The cached prefix (persona + client data) is byte-identical to the
    // no-rules case, so prompt caching is never invalidated by rule edits.
    expect(blocks.slice(0, 2)).toEqual(buildCachedSystem(CHAT_SYSTEM_PROMPT, clientData));
    expect(blocks[2].cache_control).toBeUndefined();
    expect(blocks[2].text).toContain("1. כלל אחד");
  });

  it("omits the section entirely when the user has no rules", () => {
    const blocks = buildCachedSystem(CHAT_SYSTEM_PROMPT, clientData, []);
    expect(blocks).toHaveLength(2);
    expect(blocks.map((b) => b.text).join("")).not.toContain(ADVISOR_RULES_HEADER);
  });
});
