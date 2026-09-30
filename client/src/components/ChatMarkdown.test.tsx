import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ChatMarkdown from "./ChatMarkdown";

// The assistant's markdown must render as formatted HTML, never as raw "##" / "**" in the bubble.
describe("ChatMarkdown", () => {
  it("renders markdown instead of showing raw markers", () => {
    const { container } = render(
      <ChatMarkdown content={"## סיכום\nהשכר שלך הוא **10,000** ש״ח\n- סעיף ראשון\n- סעיף שני"} />
    );
    expect(screen.getByText("סיכום")).toBeTruthy();
    expect(screen.getByText("10,000").tagName).toBe("STRONG");
    expect(container.querySelectorAll("li")).toHaveLength(2);
    expect(container.textContent).not.toContain("##");
    expect(container.textContent).not.toContain("**");
  });
});
