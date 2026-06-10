import { FileStack, Folder, Layers, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/common/IconButton";
import { EmptyState } from "@/components/common/EmptyState";
import { cn } from "@/lib/cn";

function CountStat({ label, value }) {
  const active = value > 0;
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-md px-2 py-1.5",
        active ? "bg-teal-subtle" : "bg-muted",
      )}
    >
      <span className={cn("text-sm font-semibold tabular-nums", active ? "text-teal-subtle-foreground" : "text-foreground")}>
        {value}
      </span>
      <span className={cn("text-[10px]", active ? "text-teal-subtle-foreground/80" : "text-muted-foreground")}>{label}</span>
    </div>
  );
}

function ContextRow({ icon: Icon, name, onRemove }) {
  return (
    <div className="group flex items-center gap-2 rounded-md border border-transparent px-1.5 py-1 hover:bg-accent/60">
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground">{name}</span>
      <IconButton icon={Minus} label="Remove from context" onClick={onRemove} className="opacity-70 group-hover:opacity-100" />
    </div>
  );
}

/** Selected folders/documents with a minus icon to remove each. */
function CurrentContextCard({ ws }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-1.5">
        <CountStat label="Folders" value={ws.counts.folders} />
        <CountStat label="Documents" value={ws.counts.documents} />
        <CountStat label="Resolved" value={ws.counts.resolved} />
      </div>

      {!ws.hasContext ? (
        <EmptyState
          icon={Layers}
          title="No context selected"
          description="Use the plus icon on a folder or document to attach it."
          className="py-4"
        />
      ) : (
        <>
          <div className={cn("flex flex-col gap-0.5")}>
            {ws.selectedFolders.map((f) => (
              <ContextRow key={f.id} icon={Folder} name={f.name} onRemove={() => ws.detach("folder", f.id)} />
            ))}
            {ws.selectedDocs.map((d) => (
              <ContextRow key={d.id} icon={FileStack} name={d.title} onRemove={() => ws.detach("document", d.id)} />
            ))}
          </div>
          <Button variant="outline" size="xs" className="self-start" onClick={ws.clearSelection}>
            Clear selection
          </Button>
        </>
      )}
    </div>
  );
}

export { CurrentContextCard };
