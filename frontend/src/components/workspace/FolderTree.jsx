import { Folder, Lock, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/common/IconButton";
import { cn } from "@/lib/cn";

function FolderRow({ ws, folder, docCount }) {
  const selected = ws.isSelected("folder", folder.id);
  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-md border border-transparent px-2 py-1.5 transition-colors hover:bg-accent/60",
        selected && "border-teal/35 bg-teal-subtle/60",
      )}
    >
      <Folder className="size-4 shrink-0 text-primary/80" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium leading-tight text-foreground">{folder.name}</p>
        <div className="mt-0.5 flex items-center gap-1">
          {folder.readOnly ? (
            <Badge variant="muted" className="gap-0.5 px-1 py-0 text-[10px]">
              <Lock className="size-2.5" /> Read-only
            </Badge>
          ) : (
            <Badge variant="teal" className="px-1 py-0 text-[10px]">Yours</Badge>
          )}
          <span className="text-[11px] text-muted-foreground">{docCount} docs</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center opacity-70 transition-opacity group-hover:opacity-100">
        <IconButton
          icon={Plus}
          label={selected ? "In context" : "Attach folder to context"}
          onClick={() => ws.attach("folder", folder.id)}
          disabled={selected}
          className={cn("hover:text-teal", selected && "text-teal")}
        />
        {folder.readOnly ? (
          <IconButton icon={Trash2} label="Read-only (mock cannot be deleted)" disabled className="opacity-40" />
        ) : (
          <DropdownMenu
            trigger={
              <Button variant="ghost" size="icon-sm" aria-label="Folder options">
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
  );
}

function Group({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="px-2 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}

/** Demo (read-only) folders above user folders. Plus = attach, trash = delete (mock disabled). */
function FolderTree({ ws }) {
  const { folders, documents } = ws.data;
  const countFor = (id) => documents.filter((d) => d.folderId === id).length;
  const demo = folders.filter((f) => f.group === "demo");
  const user = folders.filter((f) => f.group === "user");

  return (
    <div className="flex flex-col gap-1.5">
      <Group label="Demo Workspace">
        {demo.map((f) => (
          <FolderRow key={f.id} ws={ws} folder={f} docCount={countFor(f.id)} />
        ))}
      </Group>
      <Group label="My Workspace">
        {user.length ? (
          user.map((f) => <FolderRow key={f.id} ws={ws} folder={f} docCount={countFor(f.id)} />)
        ) : (
          <p className="px-2 py-1 text-[11px] text-muted-foreground">No folders yet.</p>
        )}
      </Group>
    </div>
  );
}

export { FolderTree };
