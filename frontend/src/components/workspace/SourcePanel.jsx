import { FolderPlus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/common/IconButton";
import { EmptyState } from "@/components/common/EmptyState";
import { cn } from "@/lib/cn";
import { SOURCE_FILTER } from "@/lib/constants";
import { SourceUploadCard } from "./SourceUploadCard";
import { FolderTree } from "./FolderTree";
import { DocumentList } from "./DocumentList";
import { getFileIcon, SourceBadge } from "./DocumentList";

function Segmented({ value, onChange }) {
  const items = [
    { id: SOURCE_FILTER.active, label: "Active" },
    { id: SOURCE_FILTER.trash, label: "Trash" },
  ];
  return (
    <div className="inline-flex rounded-md bg-muted p-0.5 text-xs">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          aria-pressed={value === item.id}
          className={cn(
            "rounded-[6px] px-2.5 py-1 font-medium transition-colors",
            value === item.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function TrashView({ ws }) {
  const { trash } = ws.data;
  if (!trash.length) {
    return <EmptyState title="Trash is empty" description="Soft-deleted uploads and folders appear here." />;
  }
  return (
    <div className="flex flex-col gap-0.5">
      <p className="px-1 pb-1 text-[11px] text-muted-foreground">
        Mock documents and folders are never trashed.
      </p>
      {trash.map((item) => {
        const Icon = getFileIcon(item.type);
        return (
          <div
            key={item.id}
            className="group flex items-center gap-2 rounded-md border border-transparent px-2 py-1.5 hover:bg-accent/60"
          >
            <Icon className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium leading-tight text-foreground">{item.title}</p>
              <div className="mt-0.5 flex items-center gap-1">
                <SourceBadge source={item.source} />
                <span className="text-[11px] text-muted-foreground">deleted {item.deletedAt}</span>
              </div>
            </div>
            <IconButton
              icon={RotateCcw}
              label="Restore"
              onClick={() => ws.notifyDeferred("Restore")}
              className="opacity-70 group-hover:opacity-100"
            />
          </div>
        );
      })}
    </div>
  );
}

/** Sources section — appears ABOVE Chat Sessions in the left sidebar. */
function SourcePanel({ ws, className }) {
  const isTrash = ws.sourceFilter === SOURCE_FILTER.trash;
  const activeDocs = ws.data.documents;

  return (
    <section className={cn("flex min-h-0 flex-col", className)}>
      <div className="flex items-center justify-between gap-2 px-3 pt-3">
        <h2 className="text-sm font-semibold tracking-tight">Sources</h2>
        <IconButton
          icon={FolderPlus}
          label="Create folder"
          onClick={() => ws.notifyDeferred("Create folder")}
        />
      </div>

      <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-2">
        <Segmented value={ws.sourceFilter} onChange={ws.setSourceFilter} />
        {!isTrash && (
          <Badge variant="muted">{activeDocs.length} docs</Badge>
        )}
      </div>

      {!isTrash && (
        <div className="px-3 pb-2">
          <SourceUploadCard ws={ws} />
        </div>
      )}

      <ScrollArea className="flex-1 px-2 pb-3">
        {isTrash ? (
          <TrashView ws={ws} />
        ) : (
          <div className="flex flex-col gap-2">
            <FolderTree ws={ws} />
            <div className="flex flex-col gap-0.5">
              <p className="px-2 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Documents
              </p>
              <DocumentList ws={ws} documents={activeDocs} />
            </div>
          </div>
        )}
      </ScrollArea>
    </section>
  );
}

export { SourcePanel };
