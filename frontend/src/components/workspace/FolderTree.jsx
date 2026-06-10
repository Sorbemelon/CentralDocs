import { useState } from "react";
import { toast } from "sonner";
import {
  Check,
  ChevronRight,
  Download,
  Eye,
  Folder,
  FolderInput,
  FolderOpen,
  FolderPlus,
  Lock,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/common/IconButton";
import { cn } from "@/lib/cn";
import { DOC_STATUS, SOURCE_KIND } from "@/lib/constants";
import { getFileIcon } from "./DocumentList";

/**
 * Tick-style attach toggle, placed BEFORE the item icon (AutumData mechanic).
 * `via` marks items included through a selected parent folder: they render
 * ticked but slightly muted, and clicking explains instead of mutating.
 */
function AttachCheck({ selected, via, disabled, onToggle, label }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
        selected
          ? cn("border-teal bg-teal text-teal-foreground", via && "opacity-70")
          : "border-input bg-card text-transparent hover:border-teal/60 hover:text-teal/50",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      <Check className="size-3" strokeWidth={3} />
    </button>
  );
}

const DOC_ICON_TONE = {
  [SOURCE_KIND.mock]: "text-muted-foreground",
  [SOURCE_KIND.uploaded]: "text-primary",
  [SOURCE_KIND.generated]: "text-success",
};

function StatusDot({ status, statusMessage }) {
  if (status === DOC_STATUS.processing) {
    return <span title="Processing" className="size-1.5 shrink-0 animate-pulse rounded-full bg-warning" />;
  }
  if (status === DOC_STATUS.failed) {
    return <span title={statusMessage || "Failed"} className="size-1.5 shrink-0 rounded-full bg-destructive" />;
  }
  return null;
}

const viaFolderNotice = () =>
  toast("Included via a selected folder", {
    description: "Untick that folder to remove it, or it stays part of the context.",
  });

function DocRow({ ws, doc }) {
  const Icon = getFileIcon(doc.type);
  const direct = ws.isSelected("document", doc.id);
  const effective = ws.isEffectivelySelected("document", doc.id);
  const via = effective && !direct;
  const attachLabel = via
    ? "Included via selected folder"
    : direct
      ? "Remove from context"
      : doc.attachable === false
        ? "Not ready to attach"
        : "Attach to context";

  const onToggle = () => {
    if (via) return viaFolderNotice();
    if (direct) return ws.detach("document", doc.id);
    return ws.attach("document", doc.id);
  };

  return (
    <div
      className={cn(
        "group flex h-7 items-center gap-1.5 rounded-md border border-transparent pl-1.5 pr-1 transition-colors hover:bg-accent/60",
        effective && "border-teal/35 bg-teal-subtle/60",
      )}
    >
      <AttachCheck
        selected={effective}
        via={via}
        disabled={!effective && doc.attachable === false}
        onToggle={onToggle}
        label={attachLabel}
      />
      <Icon className={cn("size-3.5 shrink-0", DOC_ICON_TONE[doc.source] || "text-muted-foreground")} />
      <span className="min-w-0 flex-1 truncate text-[12.5px] leading-none text-foreground">{doc.title}</span>
      <StatusDot status={doc.status} statusMessage={doc.statusMessage} />
      <div className="flex shrink-0 items-center opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        <IconButton icon={Eye} label="Preview" size="icon-xs" onClick={() => ws.openPreview(doc.id)} />
        <DropdownMenu
          trigger={
            <Button variant="ghost" size="icon-xs" aria-label="Document options">
              <MoreHorizontal />
            </Button>
          }
        >
          <DropdownMenuItem onClick={() => ws.downloadDocument(doc)} disabled={doc.downloadAvailable === false}>
            <Download /> Download
          </DropdownMenuItem>
          {doc.retryAvailable && (
            <DropdownMenuItem onClick={() => ws.retryDocument(doc)}>
              <RefreshCw /> Retry processing
            </DropdownMenuItem>
          )}
          {!doc.readOnly && (
            <>
              <DropdownMenuItem onClick={() => ws.requestMove(doc)}>
                <FolderInput /> Move to folder
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem tone="destructive" onClick={() => ws.requestDeleteDocument(doc)}>
                <Trash2 /> Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenu>
      </div>
    </div>
  );
}

function FolderNode({ ws, folder, depth }) {
  const [open, setOpen] = useState(true);
  const direct = ws.isSelected("folder", folder.id);
  const effective = ws.isEffectivelySelected("folder", folder.id);
  const via = effective && !direct;
  const FolderIcon = open ? FolderOpen : Folder;

  const childFolders = ws.folderChildren.get(folder.id) || [];
  const docs = ws.data.documents.filter((d) => d.folderId === folder.id);

  const onToggle = () => {
    if (via) return viaFolderNotice();
    if (direct) return ws.detach("folder", folder.id);
    return ws.attach("folder", folder.id);
  };

  return (
    <div className="flex flex-col">
      <div
        className={cn(
          "group flex h-7 items-center gap-1.5 rounded-md border border-transparent pl-0.5 pr-1 transition-colors hover:bg-accent/60",
          effective && "border-teal/35 bg-teal-subtle/60",
        )}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? `Collapse ${folder.name}` : `Expand ${folder.name}`}
          aria-expanded={open}
          className="inline-flex size-4 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className={cn("size-3.5 transition-transform", open && "rotate-90")} />
        </button>
        <AttachCheck
          selected={effective}
          via={via}
          onToggle={onToggle}
          label={
            via
              ? "Included via selected folder"
              : direct
                ? "Remove folder from context"
                : "Attach folder to context"
          }
        />
        <FolderIcon className={cn("size-3.5 shrink-0", folder.readOnly ? "text-primary/70" : "text-teal")} />
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium leading-none text-foreground">
          {folder.name}
        </span>
        {folder.readOnly && <Lock className="size-3 shrink-0 text-muted-foreground/70" title="Read-only demo folder" />}
        <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{docs.length}</span>
        <div className="flex shrink-0 items-center opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
          <IconButton
            icon={FolderPlus}
            label={folder.readOnly ? "Demo folders are read-only — create at root instead" : "New folder inside"}
            size="icon-xs"
            disabled={folder.readOnly}
            onClick={() => ws.createFolder(folder.id)}
          />
          {!folder.readOnly && (
            <DropdownMenu
              trigger={
                <Button variant="ghost" size="icon-xs" aria-label="Folder options">
                  <MoreHorizontal />
                </Button>
              }
            >
              <DropdownMenuItem onClick={() => ws.requestRename({ kind: "folder", folder, title: folder.name })}>
                <Pencil /> Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem tone="destructive" onClick={() => ws.requestDeleteFolder(folder)}>
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenu>
          )}
        </div>
      </div>

      {open && (childFolders.length > 0 || docs.length > 0) && (
        <div className={cn("ml-3.5 flex flex-col gap-px border-l border-sidebar-border/80 pl-1.5", depth >= 3 && "ml-2.5")}>
          {childFolders.map((child) => (
            <FolderNode key={child.id} ws={ws} folder={child} depth={depth + 1} />
          ))}
          {docs.map((d) => (
            <DocRow key={d.id} ws={ws} doc={d} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Nested source tree (AutumData-style): folders contain child folders and
 * documents with real indentation + guide lines. Tick before the icon attaches;
 * ticking a folder cascades to everything inside it.
 */
function FolderTree({ ws }) {
  const { folders, documents } = ws.data;
  const folderIds = new Set(folders.map((f) => f.id));
  const rootFolders = ws.folderChildren.get(null) || [];
  const rootDocs = documents.filter((d) => !d.folderId || !folderIds.has(d.folderId));

  return (
    <div className="flex flex-col gap-px">
      {rootFolders.map((f) => (
        <FolderNode key={f.id} ws={ws} folder={f} depth={0} />
      ))}
      {rootDocs.map((d) => (
        <DocRow key={d.id} ws={ws} doc={d} />
      ))}
      <button
        type="button"
        onClick={() => ws.createFolder()}
        className="mt-0.5 flex items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-[11px] text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
      >
        <FolderPlus className="size-3.5" /> New folder
      </button>
    </div>
  );
}

export { FolderTree };
