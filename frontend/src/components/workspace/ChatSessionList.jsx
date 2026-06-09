import { Archive, MessageSquarePlus, MessageSquareText, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/cn";

function ChatRow({ ws, chat }) {
  const active = chat.id === ws.activeChatId;
  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-md border border-transparent px-2 py-1.5 transition-colors",
        active ? "border-border bg-accent text-accent-foreground" : "hover:bg-accent/60",
      )}
    >
      <button
        type="button"
        onClick={() => ws.setActiveChat(chat.id)}
        className="flex min-w-0 flex-1 items-center gap-2 text-left focus-visible:outline-none"
      >
        <MessageSquareText className={cn("size-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium leading-tight text-foreground">{chat.title}</span>
          <span className="text-[11px] text-muted-foreground">{chat.contextCount} docs</span>
        </span>
      </button>
      <DropdownMenu
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label="Chat options" className="opacity-70 group-hover:opacity-100">
            <MoreHorizontal />
          </Button>
        }
      >
        <DropdownMenuItem onClick={() => ws.notifyDeferred("Rename chat")}>
          <Pencil /> Rename
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => ws.notifyDeferred("Archive chat")}>
          <Archive /> Archive
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem tone="destructive" onClick={() => ws.notifyDeferred("Delete chat")}>
          <Trash2 /> Delete
        </DropdownMenuItem>
      </DropdownMenu>
    </div>
  );
}

/** Chat sessions — always visible BELOW Sources (never hidden in a dropdown). */
function ChatSessionList({ ws, className }) {
  return (
    <section className={cn("flex min-h-0 flex-col", className)}>
      <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold tracking-tight">Chats</h2>
          <Badge variant="muted">{ws.chats.length}</Badge>
        </div>
        <Button size="xs" variant="secondary" onClick={ws.newChat}>
          <MessageSquarePlus /> New Chat
        </Button>
      </div>
      <ScrollArea className="flex-1 px-2 pb-2">
        <div className="flex flex-col gap-0.5">
          {ws.chats.map((chat) => (
            <ChatRow key={chat.id} ws={ws} chat={chat} />
          ))}
        </div>
      </ScrollArea>
    </section>
  );
}

export { ChatSessionList };
