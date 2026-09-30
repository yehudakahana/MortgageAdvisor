import { describe, it, expect } from "vitest";
import { fieldLabel, isTranslatedLabel } from "./documentFields";

describe("fieldLabel", () => {
  it("translates the extraction keys the model actually returns", () => {
    expect(fieldLabel("employer")).toBe("מעסיק");
    expect(fieldLabel("period")).toBe("תקופה");
    expect(isTranslatedLabel("employer")).toBe(true);
    expect(isTranslatedLabel("period")).toBe(true);
  });

  it("still falls back to a humanized key for unknown fields", () => {
    expect(fieldLabel("someNewField")).toBe("Some New Field");
    expect(isTranslatedLabel("someNewField")).toBe(false);
  });
});
