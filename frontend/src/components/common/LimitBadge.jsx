import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

/**
 * Compact usage/limit badge, e.g. "Uploads 0/5".
 * Turns amber/red as usage approaches/reaches the limit.
 */
function LimitBadge({ label, used = 0, limit = 0, className }) {
  const ratio = limit > 0 ? used / limit : 0;
  const variant = ratio >= 1 ? "destructive" : ratio >= 0.8 ? "warning" : "secondary";
  return (
    <Badge variant={variant} className={cn("tabular-nums", className)}>
      {label} {used}/{limit}
    </Badge>
  );
}

export { LimitBadge };
