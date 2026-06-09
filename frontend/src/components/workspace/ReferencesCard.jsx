import { Quote } from "lucide-react";

const EXAMPLE_REFERENCES = [
  { n: 1, title: "Rollout Risk Discussion Transcript", locator: "timestamp 00:14:22", usedFor: "Identifying the top rollout risks." },
  { n: 2, title: "Digital Workspace Rollout Plan", locator: "slide 7", usedFor: "Phase 2 migration and approval risks." },
];

/** Placeholder for references from the selected assistant answer. */
function ReferencesCard() {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] text-muted-foreground">
        References from the selected answer appear here. Example format:
      </p>
      {EXAMPLE_REFERENCES.map((ref) => (
        <div key={ref.n} className="rounded-md border border-border bg-card/60 p-2 text-[12px]">
          <p className="flex items-center gap-1.5 font-medium text-foreground">
            <span className="text-primary">[{ref.n}]</span>
            <Quote className="size-3 text-muted-foreground" />
            <span className="min-w-0 truncate">{ref.title}</span>
          </p>
          <p className="pl-5 font-mono text-[11px] text-muted-foreground">{ref.locator}</p>
          <p className="pl-5 text-[11px] text-muted-foreground">Used for: {ref.usedFor}</p>
        </div>
      ))}
    </div>
  );
}

export { ReferencesCard };
