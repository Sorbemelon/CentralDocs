import { FileText, MessageSquare, Search, Sparkles } from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

const TAB_ICONS = {
  chat: MessageSquare,
  search: Search,
  preview: FileText,
  generated: Sparkles,
};

const TABS = [
  { id: "chat", label: "Chat" },
  { id: "search", label: "Search" },
  { id: "preview", label: "Preview" },
  { id: "generated", label: "Generated" },
];

/** Compact, sticky tab strip for the center work area (components, not routes). */
function WorkspaceTabs() {
  return (
    <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <TabsList>
        {TABS.map((tab) => {
          const Icon = TAB_ICONS[tab.id];
          return (
            <TabsTrigger key={tab.id} value={tab.id}>
              <Icon className="size-4" />
              {tab.label}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </div>
  );
}

export { WorkspaceTabs };
