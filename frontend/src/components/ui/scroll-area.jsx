import { forwardRef } from "react";
import { cn } from "@/lib/cn";

/**
 * Scrollable region with the app's styled scrollbars.
 * `min-h-0` lets it shrink inside flex layouts so panels scroll independently.
 */
const ScrollArea = forwardRef(function ScrollArea({ className, children, ...props }, ref) {
  return (
    <div ref={ref} className={cn("min-h-0 overflow-y-auto overflow-x-hidden", className)} {...props}>
      {children}
    </div>
  );
});

export { ScrollArea };
