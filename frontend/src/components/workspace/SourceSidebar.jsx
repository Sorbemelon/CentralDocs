import { cn } from "@/lib/cn";
import { SourcePanel } from "./SourcePanel";
import { ChatSessionList } from "./ChatSessionList";

/**
 * Left sidebar. Order is fixed: Sources first, then Chat Sessions.
 * Each section scrolls independently.
 */
function SourceSidebar({ ws, className }) {
  return (
    <aside className={cn("flex min-h-0 flex-col border-r border-sidebar-border bg-sidebar", className)}>
      <SourcePanel ws={ws} className="min-h-0 flex-1" />
      <ChatSessionList ws={ws} />
    </aside>
  );
}

export { SourceSidebar };
