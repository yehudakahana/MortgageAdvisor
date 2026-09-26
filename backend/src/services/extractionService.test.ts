import { describe, expect, it } from "vitest";
import { parseAndValidateJsonResponse } from "./extractionService";

describe("parseAndValidateJsonResponse", () => {
  it("keeps a well-formed extraction intact", () => {
    const out = parseAndValidateJsonResponse(
      JSON.stringify({ structuredFields: { name: "דני", amount: 100 }, rawText: "טקסט" })
    );
    expect(out.structuredFields).toEqual({ name: "דני", amount: 100 });
    expect(out.rawText).toBe("טקסט");
  });

  it("strips markdown fences before parsing", () => {
    const out = parseAndValidateJsonResponse(
      '```json\n{"structuredFields": {"a": 1}, "rawText": null}\n```'
    );
    expect(out.structuredFields).toEqual({ a: 1 });
  });

  it("drops extra top-level keys not in the contract", () => {
    const out = parseAndValidateJsonResponse(
      JSON.stringify({
        structuredFields: { a: 1 },
        rawText: "x",
        injected: "malicious",
        __proto__: { polluted: true },
      })
    );
    expect(out).toEqual({ structuredFields: { a: 1 }, rawText: "x" });
    expect("injected" in out).toBe(false);
  });

  it("nulls structuredFields when it is not an object", () => {
    const out = parseAndValidateJsonResponse(
      JSON.stringify({ structuredFields: ["not", "an", "object"], rawText: "x" })
    );
    expect(out.structuredFields).toBeNull();
  });

  it("nulls rawText when it is not a string", () => {
    const out = parseAndValidateJsonResponse(
      JSON.stringify({ structuredFields: {}, rawText: { nested: "object" } })
    );
    expect(out.rawText).toBeNull();
  });

  it("truncates oversized string values", () => {
    const big = "x".repeat(30000);
    const out = parseAndValidateJsonResponse(
      JSON.stringify({ structuredFields: { blob: big }, rawText: "x" })
    );
    expect((out.structuredFields as Record<string, string>).blob).toHaveLength(20000);
  });

  it("caps the number of keys", () => {
    const fields: Record<string, number> = {};
    for (let i = 0; i < 600; i++) fields[`k${i}`] = i;
    const out = parseAndValidateJsonResponse(
      JSON.stringify({ structuredFields: fields, rawText: null })
    );
    expect(Object.keys(out.structuredFields as object)).toHaveLength(500);
  });

  it("throws on JSON that is not an object", () => {
    expect(() => parseAndValidateJsonResponse("[1, 2, 3]")).toThrow();
    expect(() => parseAndValidateJsonResponse('"just a string"')).toThrow();
    expect(() => parseAndValidateJsonResponse("not json at all")).toThrow();
  });
});
