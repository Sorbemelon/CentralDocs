import { Link } from "react-router-dom";
import { Clock, PanelLeft, PanelRight, Trash2 } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { BackendStatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { IconButton } from "@/components/common/IconButton";

/** Top = brand + system/session controls. Usage limits live in the right-panel Usage card. */
function WorkspaceTopBar({ ws, onToggleSources, onToggleContext }) {
  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-3 shadow-sm">
      <IconButton
        icon={PanelLeft}
        label="Toggle sources"
        className="md:hidden"
        onClick={onToggleSources}
      />
      <Link
        to="/"
        className="flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Logo size="md" />
      </Link>

      <div className="ml-auto flex items-center gap-1.5">
        <Badge variant="muted" className="hidden gap-1 sm:inline-flex">
          <Clock className="size-3" />
          Session 3d
        </Badge>
        <BackendStatusBadge status={ws.backendStatus} className="hidden sm:inline-flex" />

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

        <ThemeToggle />

        <IconButton
          icon={PanelRight}
          label="Toggle context"
          className="xl:hidden"
          onClick={onToggleContext}
        />
      </div>
    </header>
  );
}

export { WorkspaceTopBar };
