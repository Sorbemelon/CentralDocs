import { PanelLeft, PanelRight, Trash2 } from "lucide-react";
import { AppTopBar } from "@/components/common/AppTopBar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { IconButton } from "@/components/common/IconButton";

/** Top = brand + system/session controls. Usage limits live in the right-panel Usage card. */
function WorkspaceTopBar({ ws, onToggleSources, onToggleContext }) {
  return (
    <AppTopBar
      brandTo="/"
      status={ws.backendStatus}
      className="shadow-sm"
      actionsBeforeTheme={
        <>
          <Separator orientation="vertical" className="mx-0.5 hidden h-5 sm:block" />

          <Button
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex"
            onClick={ws.requestClearSession}
            disabled={!ws.online}
            title={ws.online ? "Clear uploaded files, generated docs, chats, and user folders" : "Backend is offline"}
          >
            <Trash2 />
            <span className="hidden md:inline">Clear Session</span>
          </Button>
        </>
      }
      trailing={
        <>
          <IconButton
            icon={PanelLeft}
            label="Toggle sources"
            className="md:hidden"
            onClick={onToggleSources}
          />
          <IconButton
            icon={PanelRight}
            label="Toggle context"
            className="xl:hidden"
            onClick={onToggleContext}
          />
        </>
      }
    />
  );
}

export { WorkspaceTopBar };
