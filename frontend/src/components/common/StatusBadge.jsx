import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { BACKEND_STATUS, DOC_STATUS } from "@/lib/constants";

const BACKEND_MAP = {
  [BACKEND_STATUS.idle]: {
    label: "Idle",
    title: "Backend status has not been checked yet.",
    variant: "muted",
    dot: "bg-muted-foreground",
  },
  [BACKEND_STATUS.starting]: {
    label: "Checking backend",
    title: "Checking backend reachability.",
    variant: "warning",
    dot: "bg-warning",
  },
  [BACKEND_STATUS.ready]: {
    label: "Live backend connected",
    title: "Live backend connected. Provider-specific actions may still report configuration errors if a dependency is missing.",
    variant: "success",
    dot: "bg-success",
  },
  [BACKEND_STATUS.offline]: {
    label: "Backend offline - local fallback",
    title: "Backend is offline. The workspace is showing local demo fallback data.",
    variant: "destructive",
    dot: "bg-destructive",
  },
};

const DOC_MAP = {
  [DOC_STATUS.ready]: { label: "Ready", variant: "success" },
  [DOC_STATUS.processing]: { label: "Processing", variant: "warning" },
  [DOC_STATUS.failed]: { label: "Failed", variant: "destructive" },
  [DOC_STATUS.trashed]: { label: "Trashed", variant: "muted" },
};

/** Backend reachability chip with a status dot. */
function BackendStatusBadge({ status = BACKEND_STATUS.idle, className }) {
  const cfg = BACKEND_MAP[status] || BACKEND_MAP[BACKEND_STATUS.idle];
  return (
    <Badge variant={cfg.variant} className={cn("gap-1.5", className)} title={cfg.title}>
      <span className={cn("size-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </Badge>
  );
}

/** Document lifecycle/status chip. */
function DocStatusBadge({ status = DOC_STATUS.ready, className }) {
  const cfg = DOC_MAP[status] || DOC_MAP[DOC_STATUS.ready];
  return (
    <Badge variant={cfg.variant} className={className}>
      {cfg.label}
    </Badge>
  );
}

export { BackendStatusBadge, DocStatusBadge };
