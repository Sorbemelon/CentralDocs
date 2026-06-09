import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/** Compact inline error with an optional retry. */
function ErrorState({ title = "Something went wrong", description, onRetry, retryLabel = "Try again", className }) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-2 rounded-md border border-border bg-destructive-subtle/60 p-3 text-destructive-subtle-foreground",
        className,
      )}
      role="alert"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-4" />
        <p className="text-sm font-medium">{title}</p>
      </div>
      {description && <p className="text-xs opacity-90">{description}</p>}
      {onRetry && (
        <Button variant="outline" size="xs" onClick={onRetry}>
          <RefreshCw />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

export { ErrorState };
