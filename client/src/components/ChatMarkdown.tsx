import ReactMarkdown, { type Components } from "react-markdown";

// Maps the assistant's markdown onto compact chat-bubble styling.
const CHAT_MARKDOWN_COMPONENTS: Components = {
  h1: ({ children }) => <p className="font-bold text-lg mt-2 mb-1 first:mt-0">{children}</p>,
  h2: ({ children }) => <p className="font-bold mt-2 mb-1 first:mt-0">{children}</p>,
  h3: ({ children }) => <p className="font-bold mt-1.5 mb-0.5 first:mt-0">{children}</p>,
  p: ({ children }) => <p className="my-1.5 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="list-disc ps-5 my-1.5 space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal ps-5 my-1.5 space-y-0.5">{children}</ol>,
  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-2">
      {children}
    </a>
  ),
};

export default function ChatMarkdown({ content }: { content: string }) {
  return <ReactMarkdown components={CHAT_MARKDOWN_COMPONENTS}>{content}</ReactMarkdown>;
}
