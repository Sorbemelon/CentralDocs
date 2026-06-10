import { FolderOpen, RotateCcw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/common/IconButton";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingState } from "@/components/common/LoadingState";
import { cn } from "@/lib/cn";
import { SOURCE_FILTER } from "@/lib/constants";
import { SourceUploadCard } from "./SourceUploadCard";
import { FolderTree } from "./FolderTree";
import { getFileIcon, SourceBadge } from "./DocumentList";

function Segmented({ value, onChange }) {
  const items = [
    { id: SOURCE_FILTER.active, label: "Active" },
    { id: SOURCE_FILTER.trash, label: "Trash" },
  ];
  return (
    <div className="inline-flex rounded-md bg-sidebar-accent p-0.5 text-xs">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          aria-pressed={value === item.id}
          className={cn(
            "rounded-[6px] px-2.5 py-0.5 font-medium transition-colors",
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
    return <EmptyState title="Trash is empty" description="No deleted user items. Mock data is never trashed." />;
  }
  return (
    <div className="flex flex-col gap-0.5">
      {trash.map((item) => {
        const Icon = getFileIcon(item.type);
        return (
          <div
            key={item.id}
            className="group flex items-center gap-2 rounded-md border border-transparent px-1.5 py-1 hover:bg-accent/60"
          >
            <Icon className="size-3.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-medium leading-tight text-foreground">{item.title}</p>
              <div className="mt-0.5 flex items-center gap-1">
                <SourceBadge source={item.source} className="px-1 py-0 text-[10px]" />
                <span className="text-[10px] text-muted-foreground">deleted {item.deletedAt}</span>
              </div>
            </div>
            <IconButton
              icon={RotateCcw}
              label="Restore"
              size="icon-xs"
              onClick={() => ws.restoreTrashItem(item)}
              className="opacity-70 group-hover:opacity-100"
            />
          </div>
        );
      })}
    </div>
  );
}

/** Sources section — upload on top, then a unified AutumData-style file tree. */
function SourcePanel({ ws, className }) {
  const isTrash = ws.sourceFilter === SOURCE_FILTER.trash;
  const loading = ws.loading?.sources;

  return (
    <section className={cn("flex min-h-0 flex-col", className)}>
      <div className="px-2.5 pt-2.5">
        <SourceUploadCard ws={ws} />
      </div>

      <div className="flex items-center justify-between gap-2 px-2.5 pb-1.5 pt-2.5">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
          <FolderOpen className="size-4 text-primary" /> Sources
          <Badge variant="muted" className="px-1 py-0 text-[10px] tabular-nums">{ws.data.documents.length}</Badge>
        </h2>
        <Segmented value={ws.sourceFilter} onChange={ws.setSourceFilter} />
      </div>

      <ScrollArea className="flex-1 px-1.5 pb-2">
        {loading ? (
          <LoadingState rows={5} />
        ) : isTrash ? (
          <TrashView ws={ws} />
        ) : (
          <FolderTree ws={ws} />
        )}
      </ScrollArea>
    </section>
  );
}

export { SourcePanel };
