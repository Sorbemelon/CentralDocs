import { useState } from "react";
import {
  Archive,
  ChevronDown,
  MessageSquarePlus,
  MessageSquareText,
  MoreHorizontal,
  Pencil,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/common/IconButton";
import { LoadingState } from "@/components/common/LoadingState";
import { EmptyState } from "@/components/common/EmptyState";
import { cn } from "@/lib/cn";

function ChatRow({ ws, chat }) {
  const active = chat.id === ws.activeChatId;
  const docCount = chat.docCount ?? chat.contextCount ?? 0;
  const canGenerate = ws.online && !chat.local && (chat.messageCount ?? 0) > 0;
  const generateReason = !ws.online
    ? "Backend is offline"
    : chat.local
      ? "Save the chat first"
      : (chat.messageCount ?? 0) === 0
        ? "Send a message first"
        : "Generate a document from this chat";

  const openGenerate = () => {
    ws.setActiveChat(chat.id);
    ws.openGenerateModal();
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-1.5 rounded-md border border-transparent px-1.5 py-1 transition-colors",
        active ? "border-primary/30 bg-primary/10" : "hover:bg-accent/60",
      )}
    >
      <button
        type="button"
        onClick={() => ws.setActiveChat(chat.id)}
        className="flex min-w-0 flex-1 items-center gap-1.5 text-left focus-visible:outline-none"
      >
        <MessageSquareText className={cn("size-3.5 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-medium leading-tight text-foreground">{chat.title}</span>
          <span className="text-[10px] text-muted-foreground">
            {docCount} {docCount === 1 ? "doc" : "docs"}
            {chat.messageCount ? ` · ${chat.messageCount} msg` : ""}
          </span>
        </span>
      </button>
      <IconButton
        icon={Sparkles}
        label={generateReason}
        size="icon-xs"
        onClick={openGenerate}
        disabled={!canGenerate}
        className={cn("opacity-0 group-focus-within:opacity-100 group-hover:opacity-100", canGenerate && "text-teal")}
      />
      <DropdownMenu
        trigger={
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Chat options"
            className="opacity-60 group-focus-within:opacity-100 group-hover:opacity-100"
          >
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

/**
 * Chat sessions — always BELOW Sources, collapsible (expanded by default).
 * When collapsed, only the header band stays, anchored to the sidebar bottom.
 */
function ChatSessionList({ ws, className }) {
  const [open, setOpen] = useState(true);

  return (
    <section
      className={cn(
        "flex flex-col border-t border-sidebar-border",
        open ? "min-h-0 flex-2 max-h-[44%]" : "mt-auto shrink-0",
        className,
      )}
    >
      <div className="mx-2 my-1.5 flex items-center justify-between gap-2 rounded-md bg-sidebar-accent px-2 py-1">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-w-0 items-center gap-1.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <h2 className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
            <MessageSquareText className="size-4 text-teal" /> Chats
          </h2>
          <Badge variant="muted" className="px-1 py-0 text-[10px] tabular-nums">{ws.chats.length}</Badge>
          <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", !open && "rotate-180")} />
        </button>
        <Button size="xs" variant="secondary" onClick={ws.newChat}>
          <MessageSquarePlus /> New Chat
        </Button>
      </div>
      {open && (
        <ScrollArea className="flex-1 px-1.5 pb-2">
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
      )}
    </section>
  );
}

export { ChatSessionList };
