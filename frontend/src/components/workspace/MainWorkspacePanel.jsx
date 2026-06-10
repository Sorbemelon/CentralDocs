import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/cn";
import { WorkspaceTabs } from "./WorkspaceTabs";
import { ChatPanelShell } from "./ChatPanelShell";
import { SearchPanelShell } from "./SearchPanelShell";
import { PreviewPanelShell } from "./PreviewPanelShell";
import { GeneratedPanelShell } from "./GeneratedPanelShell";

/** Center work area. Internal tabs only (Chat default). Scrolls independently. */
function MainWorkspacePanel({ ws, className }) {
  return (
    <main className={cn("flex min-h-0 flex-col bg-background", className)}>
      <Tabs value={ws.activeTab} onValueChange={ws.setActiveTab} className="flex min-h-0 flex-1 flex-col">
        <WorkspaceTabs ws={ws} />
        <ScrollArea className="flex-1">
          <div className="mx-auto w-full max-w-3xl p-3 md:p-4">
            <TabsContent value="chat">
              <ChatPanelShell ws={ws} />
            </TabsContent>
            <TabsContent value="search">
              <SearchPanelShell ws={ws} />
            </TabsContent>
            <TabsContent value="preview">
              <PreviewPanelShell ws={ws} />
            </TabsContent>
            <TabsContent value="generated">
              <GeneratedPanelShell ws={ws} />
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </main>
  );
}

export { MainWorkspacePanel };
