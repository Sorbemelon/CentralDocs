import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/cn";

function expandCitationToken(token = "") {
  const numbers = [];
  for (const part of String(token).split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const range = /^(\d+)\s*[-–—]\s*(\d+)$/.exec(trimmed);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      const low = Math.min(start, end);
      const high = Math.max(start, end);
      for (let value = low; value <= high; value += 1) numbers.push(value);
      continue;
    }
    const single = Number(trimmed);
    if (Number.isInteger(single) && single > 0) numbers.push(single);
  }
  return [...new Set(numbers)];
}

function linkCitationMarkers(markdown = "", referenceNumbers = new Set()) {
  const pattern = /\[((?:\s*\d+\s*(?:[-–—]\s*\d+\s*)?)(?:,\s*\d+\s*(?:[-–—]\s*\d+\s*)?)*)\]/g;
  return String(markdown || "").replace(pattern, (full, token) => {
    const numbers = expandCitationToken(token).filter((number) => referenceNumbers.has(number));
    if (!numbers.length) return full;
    return `[${token.trim()}](#centraldocs-citation-${numbers.join("-")})`;
  });
}

const markdownComponents = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-4 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-4 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-primary-foreground/60 pl-3 text-primary-foreground/90">
      {children}
    </blockquote>
  ),
  code: ({ inline, children }) =>
    inline ? (
      <code className="rounded bg-primary-foreground/15 px-1 py-0.5 font-mono text-[0.92em]">{children}</code>
    ) : (
      <code className="block overflow-x-auto rounded bg-primary-foreground/15 p-2 font-mono text-[0.9em]">
        {children}
      </code>
    ),
  pre: ({ children }) => <pre className="my-2 overflow-x-auto">{children}</pre>,
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="min-w-full border-collapse text-left text-[12px]">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border border-primary-foreground/25 px-2 py-1 font-semibold">{children}</th>,
  td: ({ children }) => <td className="border border-primary-foreground/25 px-2 py-1">{children}</td>,
};

function CitationLink({ href = "", children, onCitationClick }) {
  if (href.startsWith("#centraldocs-citation-")) {
    const numbers = href
      .replace("#centraldocs-citation-", "")
      .split("-")
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0);
    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onCitationClick?.(numbers[0]);
        }}
        className="mx-0.5 inline-flex translate-y-[-1px] rounded border border-background/80 bg-background px-1 py-0 text-[11px] font-bold leading-4 text-primary shadow-sm transition-colors hover:bg-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background"
        title={`Show reference ${numbers.join(", ")}`}
      >
        {children}
      </button>
    );
  }

  return (
    <a href={href} className="underline underline-offset-2" target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

export function MarkdownContent({ content, references = [], onCitationClick, className }) {
  const referenceNumbers = new Set(references.map((ref) => Number(ref.number)).filter(Number.isFinite));
  const linked = linkCitationMarkers(content, referenceNumbers);
  const components = {
    ...markdownComponents,
    a: ({ href, children }) => (
      <CitationLink href={href} onCitationClick={onCitationClick}>
        {children}
      </CitationLink>
    ),
  };

  return (
    <div className={cn("markdown-content", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {linked}
      </ReactMarkdown>
    </div>
  );
}
