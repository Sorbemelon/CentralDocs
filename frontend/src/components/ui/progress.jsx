import { cn } from "@/lib/cn";

/**
 * Compact determinate progress bar.
 * `tone` maps to a semantic color so usage rows can signal nearing limits.
 */
function Progress({ value = 0, max = 100, tone = "primary", className, ...props }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const toneClass =
    tone === "warning"
      ? "bg-warning"
      : tone === "destructive"
        ? "bg-destructive"
        : tone === "success"
          ? "bg-success"
          : "bg-primary";

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}
      {...props}
    >
      <div className={cn("h-full rounded-full transition-[width] duration-300", toneClass)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export { Progress };
