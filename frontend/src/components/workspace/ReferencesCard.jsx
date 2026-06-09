import { Quote } from "lucide-react";

const EXAMPLE_REFERENCES = [
  { number: 1, title: "Rollout Risk Discussion Transcript", locator: "timestamp 0:14", usedFor: "Identifying the top rollout risks." },
  { number: 2, title: "Digital Workspace Rollout Plan", locator: "slide 7", usedFor: "Phase 2 migration and approval risks." },
];

function ReferenceRow({ reference }) {
  return (
    <div className="rounded-md border border-border bg-card/60 p-2 text-[12px]">
      <p className="flex items-center gap-1.5 font-medium text-foreground">
        <span className="text-primary">[{reference.number}]</span>
        <Quote className="size-3 shrink-0 text-muted-foreground" />
        <span className="min-w-0 truncate">{reference.title}</span>
      </p>
      {reference.locator && <p className="pl-5 font-mono text-[11px] text-muted-foreground">{reference.locator}</p>}
      <p className="pl-5 text-[11px] text-muted-foreground">Used for: {reference.usedFor}</p>
    </div>
  );
}

/**
 * References card. When the Search tab is active and has results, shows the
 * latest semantic-search references. Otherwise shows the assistant-answer
 * placeholder format. Safe display fields only (no internal vectors or storage keys).
 */
function ReferencesCard({ ws }) {
  const searchRefs = ws?.activeTab === "search" ? ws?.search?.references || [] : [];

  if (searchRefs.length) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-[11px] text-muted-foreground">Search references from the latest query:</p>
        {searchRefs.map((ref) => (
          <ReferenceRow key={ref.number} reference={ref} />
        ))}
      </div>
    );
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
