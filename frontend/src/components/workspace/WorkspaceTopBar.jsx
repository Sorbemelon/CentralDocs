import { Link } from "react-router-dom";
import { Clock, PanelLeft, PanelRight, Trash2 } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { BackendStatusBadge } from "@/components/common/StatusBadge";
import { LimitBadge } from "@/components/common/LimitBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { IconButton } from "@/components/common/IconButton";

/** Top = system/session controls. ~54px tall, compact badges. */
function WorkspaceTopBar({ ws, onToggleSources, onToggleContext }) {
  const { usage } = ws.data;
  return (
    <header className="flex h-[54px] shrink-0 items-center gap-2 border-b border-border bg-card px-3">
      <IconButton
        icon={PanelLeft}
        label="Toggle sources"
        className="md:hidden"
        onClick={onToggleSources}
      />
      <Link to="/" className="flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Logo size="sm" />
      </Link>

      <div className="ml-auto flex items-center gap-1.5">
        <Badge variant="muted" className="hidden gap-1 sm:inline-flex">
          <Clock className="size-3" />
          Session 3d
        </Badge>
        <BackendStatusBadge status={ws.backendStatus} className="hidden sm:inline-flex" />

        <Separator orientation="vertical" className="mx-0.5 hidden h-5 lg:block" />

        <span className="hidden items-center gap-1.5 lg:flex">
          <LimitBadge label="Uploads" used={usage.uploads.used} limit={usage.uploads.limit} />
          <LimitBadge label="Prompts" used={usage.prompts.used} limit={usage.prompts.limit} />
          <LimitBadge label="Generated" used={usage.generated.used} limit={usage.generated.limit} />
        </span>

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
