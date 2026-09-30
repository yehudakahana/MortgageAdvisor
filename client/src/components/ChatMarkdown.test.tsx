import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ReactMarkdown, { type Components } from "react-markdown";

// Mirrors CHAT_MARKDOWN_COMPONENTS in Chat.tsx: the assistant's markdown must
// render as formatted HTML, never as raw "##" / "**" in the bubble.
const components: Components = {
  h2: ({ children }) => <p className="font-bold mt-2 mb-1 first:mt-0">{children}</p>,
  p: ({ children }) => <p className="my-1.5 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="list-disc ps-5 my-1.5 space-y-0.5">{children}</ul>,
  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
};

describe("assistant markdown rendering", () => {
  it("renders markdown instead of showing raw markers", () => {
    const { container } = render(
      <ReactMarkdown components={components}>
        {"## סיכום\nהשכר שלך הוא **10,000** ש״ח\n- סעיף ראשון\n- סעיף שני"}
      </ReactMarkdown>
    );
    expect(screen.getByText("סיכום")).toBeTruthy();
    expect(screen.getByText("10,000").tagName).toBe("STRONG");
    expect(container.querySelectorAll("li")).toHaveLength(2);
    expect(container.textContent).not.toContain("##");
    expect(container.textContent).not.toContain("**");
  });
});
