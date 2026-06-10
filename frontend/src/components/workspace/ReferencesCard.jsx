import { Quote } from "lucide-react";

const EXAMPLE_REFERENCES = [
  { number: 1, title: "Rollout Risk Discussion Transcript", locator: "timestamp 0:14", usedFor: "Identifying the top rollout risks." },
  { number: 2, title: "Digital Workspace Rollout Plan", locator: "slide 7", usedFor: "Phase 2 migration and approval risks." },
];

function ReferenceRow({ reference, usedForFallback }) {
  return (
    <div className="rounded-md border border-border bg-background p-2 text-[12px] shadow-sm">
      <p className="flex items-center gap-1.5 font-medium text-foreground">
        <span className="inline-flex size-4.5 shrink-0 items-center justify-center rounded bg-primary/10 text-[10px] font-semibold text-primary">
          {reference.number}
        </span>
        <span className="min-w-0 truncate">{reference.title}</span>
        <Quote className="ml-auto size-3 shrink-0 text-muted-foreground/70" />
      </p>
      {reference.locator && (
        <p className="mt-0.5 pl-6">
          <span className="rounded bg-teal-subtle px-1 py-px font-mono text-[10px] text-teal-subtle-foreground">
            {reference.locator}
          </span>
        </p>
      )}
      <p className="mt-0.5 pl-6 text-[11px] text-muted-foreground">Used for: {reference.usedFor || usedForFallback}</p>
    </div>
  );
}

/**
 * References card. Chat tab → selected/latest assistant references; Search tab →
 * latest semantic-search references; otherwise the assistant-answer placeholder.
 * Safe display fields only (no internal vectors or storage keys).
 */
function ReferencesCard({ ws }) {
  const tab = ws?.activeTab;

  if (tab === "chat") {
    const refs = ws?.chat?.activeReferences || [];
    if (refs.length) {
      return (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] text-muted-foreground">References used by the selected answer:</p>
          {refs.map((ref) => (
            <ReferenceRow key={ref.number} reference={ref} usedForFallback="chat answer evidence" />
          ))}
        </div>
      );
    }
  }

  if (tab === "search") {
    const refs = ws?.search?.references || [];
    if (refs.length) {
      return (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] text-muted-foreground">Search references from the latest query:</p>
          {refs.map((ref) => (
            <ReferenceRow key={ref.number} reference={ref} usedForFallback="semantic search match" />
          ))}
        </div>
      );
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] text-muted-foreground">
        References from the selected answer appear here. Example format:
      </p>
      {EXAMPLE_REFERENCES.map((ref) => (
        <ReferenceRow key={ref.number} reference={ref} />
      ))}
    </div>
  );
}

export { ReferencesCard };
