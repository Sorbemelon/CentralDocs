import { FileText, Folder, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";

function Row({ icon: Icon, iconClass, name, sub, onRemove }) {
  return (
    <div className="group flex items-center gap-1.5 rounded-md border border-transparent px-1 py-0.5 hover:bg-accent/60">
      <Icon className={`size-3 shrink-0 ${iconClass}`} />
      <span className="min-w-0 flex-1 truncate text-[12px] text-foreground" title={name}>
        {name}
        {sub && <span className="ml-1 text-[10px] text-muted-foreground">{sub}</span>}
      </span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded px-1 text-[11px] font-medium text-destructive opacity-0 transition-opacity hover:bg-destructive-subtle group-focus-within:opacity-100 group-hover:opacity-100"
        >
          Remove
        </button>
      )}
    </div>
  );
}

/**
 * Current selected context: counts documents only (folder selections contribute
 * their documents). Items are removed with a text "Remove" action.
 */
function CurrentContextCard({ ws }) {
  const docCount = ws.counts.contextDocs;
  const selectedDocIds = new Set(ws.selection.docIds);
  // Documents contributed by selected folders (not directly ticked themselves).
  const folderDocs = ws.data.documents.filter(
    (d) => ws.selection.folderIds.includes(d.folderId) && !selectedDocIds.has(d.id),
  );

  if (!ws.hasContext) {
    return (
      <EmptyState
        icon={Layers}
        title="No context selected"
        description="Tick a folder or document in Sources to attach it."
        className="py-3"
      />
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="rounded-md bg-teal-subtle px-2 py-1 text-[11px] font-medium text-teal-subtle-foreground">
        Documents in context: <span className="tabular-nums">{docCount}</span>
      </p>

      <div className="flex flex-col">
        {ws.selectedFolders.map((f) => (
          <Row
            key={f.id}
            icon={Folder}
            iconClass="text-teal"
            name={f.name}
            onRemove={() => ws.detach("folder", f.id)}
          />
        ))}
        {folderDocs.map((d) => (
          <Row key={d.id} icon={FileText} iconClass="ml-3 text-muted-foreground" name={d.title} sub="via folder" />
        ))}
        {ws.selectedDocs.map((d) => (
          <Row
            key={d.id}
            icon={FileText}
            iconClass="text-primary"
            name={d.title}
            onRemove={() => ws.detach("document", d.id)}
          />
        ))}
      </div>

      <Button variant="outline" size="xs" className="self-start" onClick={ws.clearSelection}>
        Clear selection
      </Button>
    </div>
  );
}

export { CurrentContextCard };
