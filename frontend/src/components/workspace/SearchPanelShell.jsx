import { Check, Info, MessagesSquare, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/common/LoadingState";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { DocStatusBadge } from "@/components/common/StatusBadge";
import { cn } from "@/lib/cn";
import { scoreToPercent } from "@/lib/workspaceData";
import { SEARCH_SCOPE_OPTIONS } from "@/lib/useSemanticSearch";
import { SEARCH_SAMPLE_QUESTIONS } from "@/data/demoCopy";
import { getFileIcon, SourceBadge } from "./DocumentList";

function ScopeChips({ scope, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {SEARCH_SCOPE_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          aria-pressed={scope === opt.id}
          className={cn(
            "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
            scope === opt.id
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function SampleQuestions({ search, disabled }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Try a question</p>
      {SEARCH_SAMPLE_QUESTIONS.map((q) => (
        <button
          key={q}
          type="button"
          disabled={disabled}
          onClick={() => search.useSampleQuestion(q)}
          className="rounded-md border border-border bg-card/60 px-2 py-1 text-left text-[12px] text-foreground transition-colors hover:border-primary/40 hover:bg-accent/60 disabled:opacity-50"
        >
          {q}
        </button>
      ))}
    </div>
  );
}

function ResultRow({ ws, result }) {
  const doc = result.id ? ws.getDocById(result.id) : null;
  const Icon = getFileIcon(doc?.type || result.fileKind);
  const selected = result.id ? ws.isSelected("document", result.id) : false;
  const notAttachable = doc?.attachable === false || !result.id;
  const percent = scoreToPercent(result.score);

  return (
    <div className="rounded-md border border-border bg-card p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-[11px] font-semibold text-primary">[{result.refNumber}]</span>
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          <p className="truncate text-[13px] font-medium">{result.title}</p>
        </div>
        {percent && <Badge variant="success" className="tabular-nums">{percent}</Badge>}
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-1">
        {(doc?.type || result.fileKind) && (
          <Badge variant="outline" className="px-1 py-0 text-[10px]">{(doc?.type || result.fileKind).toUpperCase()}</Badge>
        )}
        {doc && <SourceBadge source={doc.source} />}
        {doc && <DocStatusBadge status={doc.status} />}
      </div>

      {result.excerpt && <p className="mt-1 line-clamp-2 text-[12px] text-muted-foreground">{result.excerpt}</p>}

      <div className="mt-1.5 flex items-center justify-between gap-2">
        {result.locator ? (
          <Badge variant="outline" className="font-mono text-[10px]">{result.locator}</Badge>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-1">
          <Button size="xs" variant="ghost" onClick={() => result.id && ws.openPreview(result.id)} disabled={!result.id}>
            Preview
          </Button>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => ws.attach("document", result.id)}
            disabled={selected || notAttachable}
            className={cn(selected && "text-teal")}
          >
            <Check /> {selected ? "Attached" : "Attach"}
          </Button>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => {
              const q =
                ws.search.query?.trim() ||
                ws.search.lastQuery ||
                (result.title ? `Tell me about "${result.title}".` : "");
              ws.chat.prefillDraftFromSearch(q);
              ws.setActiveTab("chat");
            }}
          >
            <MessagesSquare /> Ask
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Semantic search tab — wired to POST /search/semantic, defaults to current context. */
function SearchPanelShell({ ws }) {
  const search = ws.search;
  const offline = !ws.online;
  const needsContext = search.scope === "current_context" && !ws.hasContext;
  const canSearch = Boolean(search.query.trim()) && !offline && !needsContext && !search.isSearching;

  const onKeyDown = (e) => {
    if (e.key === "Enter" && canSearch) {
      e.preventDefault();
      search.runSearch();
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search.query}
            onChange={(e) => search.setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search by meaning across selected documents..."
            className="pl-8"
            maxLength={500}
          />
        </div>
        <Button
          size="sm"
          onClick={() => search.runSearch()}
          disabled={!canSearch}
          title={offline ? "Backend is offline" : undefined}
        >
          <Search /> Search
        </Button>
      </div>

      <ScopeChips scope={search.scope} onChange={search.setScope} />

      {!offline && needsContext && (
        <div className="flex items-center gap-1.5 rounded-md bg-teal-subtle px-2 py-1 text-[11px] text-teal-subtle-foreground">
          <Info className="size-3.5 shrink-0" /> Select a document or folder first, or switch scope to All demo docs.
        </div>
      )}

      {search.stats && !search.isSearching && (
        <p className="text-[11px] text-muted-foreground">
          {search.stats.resultCount} result{search.stats.resultCount === 1 ? "" : "s"} · top {search.topK}
          {search.lastScope ? ` · scope: ${search.lastScope.replace("_", " ")}` : ""}
        </p>
      )}

      {search.warnings?.map((w) => (
        <p key={w.code} className="text-[11px] text-muted-foreground">{w.message}</p>
      ))}

      {search.isSearching ? (
        <LoadingState rows={4} label="Searching…" />
      ) : search.error ? (
        <ErrorState
          title="Search failed"
          description="The search request didn't complete. Try again."
          onRetry={() => search.runSearch(search.lastQuery || search.query)}
        />
      ) : search.results.length ? (
        <div className="flex flex-col gap-2">
          {search.results.map((r) => (
            <ResultRow key={r.chunkId || `${r.id}-${r.refNumber}`} ws={ws} result={r} />
          ))}
        </div>
      ) : search.lastQuery ? (
        <EmptyState
          icon={Search}
          title="No matches"
          description="No results for that query and scope. Try different words or a wider scope."
          action={<SampleQuestions search={search} disabled={offline} />}
        />
      ) : (
        <EmptyState
          icon={Search}
          title="Search by meaning"
          description="Ask in natural language. Results cite the document, location, and similarity."
          action={<SampleQuestions search={search} disabled={offline} />}
        />
      )}
    </div>
  );
}

export { SearchPanelShell };
