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
        <div className="flex min-h-0 flex-1 flex-col">
          <TabsContent value="chat" className="flex min-h-0 flex-1 flex-col">
            <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col p-3 md:p-4">
              <ChatPanelShell ws={ws} />
            </div>
          </TabsContent>
          <TabsContent value="search" className="min-h-0 flex-1">
            <ScrollArea className="h-full">
              <div className="mx-auto w-full max-w-3xl p-3 md:p-4">
                <SearchPanelShell ws={ws} />
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="preview" className="min-h-0 flex-1">
            <ScrollArea className="h-full">
              <div className="mx-auto w-full max-w-3xl p-3 md:p-4">
                <PreviewPanelShell ws={ws} />
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="generated" className="min-h-0 flex-1">
            <ScrollArea className="h-full">
              <div className="mx-auto w-full max-w-3xl p-3 md:p-4">
                <GeneratedPanelShell ws={ws} />
              </div>
            </ScrollArea>
          </TabsContent>
        </div>
      </Tabs>
    </main>
  );
}

export { MainWorkspacePanel };
