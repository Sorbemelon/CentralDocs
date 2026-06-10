import { useState } from "react";
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
 * Checked = in the current selected context; click toggles attach/detach.
 */
function AttachCheck({ selected, disabled, onToggle, label }) {
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
          ? "border-teal bg-teal text-teal-foreground"
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

function DocRow({ ws, doc, indent }) {
  const Icon = getFileIcon(doc.type);
  const selected = ws.isSelected("document", doc.id);
  const attachLabel = selected
    ? "Remove from context"
    : doc.attachable === false
      ? "Not ready to attach"
      : "Attach to context";

  return (
    <div
      className={cn(
        "group flex h-7 items-center gap-1.5 rounded-md border border-transparent pr-1 transition-colors hover:bg-accent/60",
        indent ? "pl-6" : "pl-1.5",
        selected && "border-teal/35 bg-teal-subtle/60",
      )}
    >
      <AttachCheck
        selected={selected}
        disabled={!selected && doc.attachable === false}
        onToggle={() => (selected ? ws.detach("document", doc.id) : ws.attach("document", doc.id))}
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

function FolderRow({ ws, folder, docs }) {
  const [open, setOpen] = useState(true);
  const selected = ws.isSelected("folder", folder.id);
  const FolderIcon = open ? FolderOpen : Folder;

  return (
    <div className="flex flex-col">
      <div
        className={cn(
          "group flex h-7 items-center gap-1.5 rounded-md border border-transparent pl-0.5 pr-1 transition-colors hover:bg-accent/60",
          selected && "border-teal/35 bg-teal-subtle/60",
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
          selected={selected}
          onToggle={() => (selected ? ws.detach("folder", folder.id) : ws.attach("folder", folder.id))}
          label={selected ? "Remove folder from context" : "Attach folder to context"}
        />
        <FolderIcon className={cn("size-3.5 shrink-0", folder.readOnly ? "text-primary/70" : "text-teal")} />
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium leading-none text-foreground">
          {folder.name}
        </span>
        {folder.readOnly && <Lock className="size-3 shrink-0 text-muted-foreground/70" title="Read-only demo folder" />}
        <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{docs.length}</span>
        {!folder.readOnly && (
          <div className="flex shrink-0 items-center opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
            <IconButton
              icon={FolderPlus}
              label="New folder inside"
              size="icon-xs"
              onClick={() => ws.createFolder(folder.id)}
            />
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
          </div>
        )}
      </div>
      {open && docs.map((d) => <DocRow key={d.id} ws={ws} doc={d} indent />)}
    </div>
  );
}

/**
 * Unified source tree (AutumData-style): folders with their documents nested,
 * unfoldered documents at the root. Tick before the icon attaches to context.
 */
function FolderTree({ ws }) {
  const { folders, documents } = ws.data;
  const folderIds = new Set(folders.map((f) => f.id));
  const docsFor = (id) => documents.filter((d) => d.folderId === id);
  const rootDocs = documents.filter((d) => !d.folderId || !folderIds.has(d.folderId));

  return (
    <div className="flex flex-col gap-px">
      {folders.map((f) => (
        <FolderRow key={f.id} ws={ws} folder={f} docs={docsFor(f.id)} />
      ))}
      {rootDocs.map((d) => (
        <DocRow key={d.id} ws={ws} doc={d} />
      ))}
    </div>
  );
}

export { FolderTree };
