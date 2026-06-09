import { useState } from "react";
import { MessageSquarePlus, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { getFileIcon } from "./DocumentList";

const SCOPES = ["Current chat context", "All demo docs", "Uploaded", "Generated"];

const SAMPLE_RESULTS = [
  {
    id: "r1",
    title: "Rollout Risk Discussion Transcript",
    type: "MD",
    locator: "00:14:22",
    score: 0.91,
    excerpt: "...the main rollout risks are change fatigue, incomplete vendor onboarding, and search adoption...",
  },
  {
    id: "r2",
    title: "Digital Workspace Rollout Plan",
    type: "PPTX",
    locator: "slide 7",
    score: 0.86,
    excerpt: "...phase 2 risks: data migration gaps and approval bottlenecks during the transition...",
  },
  {
    id: "r3",
    title: "Document Management Policy",
    type: "PDF",
    locator: "page 3",
    score: 0.78,
    excerpt: "...retention and access controls reduce operational risk across managed documents...",
  },
];

/** Semantic search tab shell. Scope chips + placeholder results; not wired. */
function SearchPanelShell({ ws }) {
  const [scope, setScope] = useState(SCOPES[0]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by meaning across your sources..." className="pl-8" maxLength={500} />
        </div>
        <Button size="sm" onClick={() => ws.notifyDeferred("Semantic search")}>
          <Search /> Search
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {SCOPES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setScope(s)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              scope === s
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[11px] text-muted-foreground">Example results (search wiring comes later):</p>
        {SAMPLE_RESULTS.map((r) => {
          const Icon = getFileIcon(r.type);
          return (
            <div key={r.id} className="rounded-md border border-border bg-card p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <p className="truncate text-[13px] font-medium">{r.title}</p>
                </div>
                <Badge variant="success" className="tabular-nums">{r.score.toFixed(2)}</Badge>
              </div>
              <p className="mt-1 line-clamp-2 text-[12px] text-muted-foreground">{r.excerpt}</p>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <Badge variant="outline" className="font-mono text-[10px]">{r.locator}</Badge>
                <div className="flex items-center gap-1">
                  <Button size="xs" variant="ghost" onClick={() => ws.notifyDeferred("Preview")}>Preview</Button>
                  <Button size="xs" variant="ghost" onClick={() => ws.notifyDeferred("Attach")}>
                    <Plus /> Attach
                  </Button>
                  <Button size="xs" variant="ghost" onClick={() => ws.notifyDeferred("Ask in chat")}>
                    <MessageSquarePlus /> Ask
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { SearchPanelShell };
