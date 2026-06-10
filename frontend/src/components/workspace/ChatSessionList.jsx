import { Archive, MessageSquarePlus, MessageSquareText, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { LoadingState } from "@/components/common/LoadingState";
import { EmptyState } from "@/components/common/EmptyState";
import { cn } from "@/lib/cn";

function ChatRow({ ws, chat }) {
  const active = chat.id === ws.activeChatId;
  const contextCount = chat.contextCount ?? 0;
  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-md border border-transparent px-2 py-1.5 transition-colors",
        active ? "border-primary/30 bg-primary/10" : "hover:bg-accent/60",
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
          <span className="text-[11px] text-muted-foreground">
            {contextCount} {contextCount === 1 ? "doc" : "docs"}
            {chat.messageCount ? ` · ${chat.messageCount} msg` : ""}
          </span>
        </span>
      </button>
      <DropdownMenu
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label="Chat options" className="opacity-70 group-hover:opacity-100">
            <MoreHorizontal />
          </Button>
        }
      >
        <DropdownMenuItem onClick={() => ws.requestRename({ kind: "chat", target: chat.id, title: chat.title })}>
          <Pencil /> Rename
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => ws.archiveChat(chat.id)}>
          <Archive /> Archive
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem tone="destructive" onClick={() => ws.requestDeleteChat(chat)}>
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
      <div className="mx-2 mb-1 mt-2 flex items-center justify-between gap-2 rounded-md bg-sidebar-accent px-2 py-1.5">
        <div className="flex items-center gap-2">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
            <MessageSquareText className="size-4 text-teal" /> Chats
          </h2>
          <Badge variant="muted">{ws.chats.length}</Badge>
        </div>
        <Button size="xs" variant="secondary" onClick={ws.newChat}>
          <MessageSquarePlus /> New Chat
        </Button>
      </div>
      <ScrollArea className="flex-1 px-2 pb-2">
        {ws.loading?.chats ? (
          <LoadingState rows={3} />
        ) : ws.chats.length ? (
          <div className="flex flex-col gap-0.5">
            {ws.chats.map((chat) => (
              <ChatRow key={chat.id} ws={ws} chat={chat} />
            ))}
          </div>
        ) : (
          <EmptyState title="No chats yet" description="Start a chat with New Chat." className="py-4" />
        )}
      </ScrollArea>
    </section>
  );
}

export { ChatSessionList };
