import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

/** Compact skeleton loading state for list/panel content (no center spinners). */
function LoadingState({ rows = 3, label, className }) {
  return (
    <div className={cn("flex flex-col gap-2 p-1", className)} aria-busy="true" aria-live="polite">
      {label && <p className="text-xs text-muted-foreground">{label}</p>}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 rounded-md border border-border bg-card p-2">
          <Skeleton className="size-7 rounded-md" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export { LoadingState };
