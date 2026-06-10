import { FileText, MessageSquare, Search, Sparkles } from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "search", label: "Search", icon: Search },
  { id: "preview", label: "Preview", icon: FileText },
  { id: "generated", label: "Generated", icon: Sparkles },
];

/** One-line purpose hint, shown only for the active tab. */
const TAB_HINTS = {
  chat: "Ask using the documents in Current Selected Context.",
  search: "Find matching source passages by meaning before asking the AI.",
  preview: "Inspect a document, its status, and available actions.",
  generated: "Review documents created from chat and reuse them as sources.",
};

/** Compact, sticky tab strip for the center work area (components, not routes). */
function WorkspaceTabs({ ws }) {
  return (
    <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-3 pb-1.5 pt-2 backdrop-blur supports-backdrop-filter:bg-background/80">
      <TabsList>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <TabsTrigger key={tab.id} value={tab.id}>
              <Icon className="size-4" />
              {tab.label}
            </TabsTrigger>
          );
        })}
      </TabsList>
      <p className="mt-1 px-0.5 text-[11px] text-muted-foreground">{TAB_HINTS[ws.activeTab]}</p>
    </div>
  );
}

export { WorkspaceTabs };
