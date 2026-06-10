import { FileText, Folder, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";

function RemoveAction({ onRemove }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="shrink-0 rounded px-1 text-[11px] font-medium text-destructive opacity-0 transition-opacity hover:bg-destructive-subtle group-focus-within:opacity-100 group-hover:opacity-100"
    >
      Remove
    </button>
  );
}

function DocLine({ title }) {
  return (
    <p className="flex items-center gap-1.5 truncate text-[12px] text-foreground">
      <FileText className="size-3 shrink-0 text-primary" />
      <span className="min-w-0 truncate" title={title}>
        {title}
      </span>
    </p>
  );
}

/** Recursive subtree for one selected folder: child folders + documents, indented. */
function FolderSubtree({ ws, folder, depth, onRemove }) {
  const childFolders = ws.folderChildren.get(folder.id) || [];
  const docs = ws.data.documents.filter((d) => d.folderId === folder.id);
  return (
    <div className="flex flex-col gap-0.5">
      <div className="group flex items-center gap-1.5 rounded-md px-1 py-0.5 hover:bg-accent/60">
        <Folder className="size-3 shrink-0 text-teal" />
        <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground" title={folder.name}>
          {folder.name}
        </span>
        {onRemove && <RemoveAction onRemove={onRemove} />}
      </div>
      {(childFolders.length > 0 || docs.length > 0) && (
        <div className="ml-2.5 flex flex-col gap-0.5 border-l border-border pl-2">
          {childFolders.map((child) => (
            <FolderSubtree key={child.id} ws={ws} folder={child} depth={depth + 1} />
          ))}
          {docs.map((d) => (
            <DocLine key={d.id} title={d.title} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Current selected context: counts documents only. Selected folders render as a
 * nested tree (subfolders + documents); directly selected documents that are
 * not already inside a selected folder appear under "Selected documents".
 * Removal is a text "Remove" action.
 */
function CurrentContextCard({ ws }) {
  const docCount = ws.counts.contextDocs;
  // Direct selections already covered by a selected folder are shown in the tree only.
  const looseDocs = ws.selectedDocs.filter((d) => !ws.effectiveFolderIds.has(d.folderId));

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

      <div className="flex flex-col gap-1">
        {ws.selectedFolders.map((f) => (
          <FolderSubtree key={f.id} ws={ws} folder={f} depth={0} onRemove={() => ws.detach("folder", f.id)} />
        ))}

        {looseDocs.length > 0 && (
          <div className="flex flex-col gap-0.5">
            {ws.selectedFolders.length > 0 && (
              <p className="pt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Selected documents
              </p>
            )}
            {looseDocs.map((d) => (
              <div key={d.id} className="group flex items-center gap-1.5 rounded-md px-1 py-0.5 hover:bg-accent/60">
                <FileText className="size-3 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate text-[12px] text-foreground" title={d.title}>
                  {d.title}
                </span>
                <RemoveAction onRemove={() => ws.detach("document", d.id)} />
              </div>
            ))}
          </div>
        )}
      </div>

      <Button variant="outline" size="xs" className="self-start" onClick={ws.clearSelection}>
        Clear selection
      </Button>
    </div>
  );
}

export { CurrentContextCard };
