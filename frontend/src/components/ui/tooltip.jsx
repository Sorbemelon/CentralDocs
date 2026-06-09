import { cn } from "@/lib/cn";

/**
 * Minimal hover/focus tooltip. Self-contained (CSS group state, no portal).
 * For dense rows; keep labels short.
 */
function Tooltip({ content, side = "top", className, children }) {
  if (!content) return children;
  const sideClass =
    side === "bottom"
      ? "top-full mt-1.5 left-1/2 -translate-x-1/2"
      : side === "left"
        ? "right-full mr-1.5 top-1/2 -translate-y-1/2"
        : side === "right"
          ? "left-full ml-1.5 top-1/2 -translate-y-1/2"
          : "bottom-full mb-1.5 left-1/2 -translate-x-1/2";

  return (
    <span className="group/tooltip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-40 hidden whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[11px] font-medium text-popover-foreground shadow-md group-hover/tooltip:block group-focus-within/tooltip:block",
          sideClass,
          className,
        )}
      >
        {content}
      </span>
    </span>
  );
}

export { Tooltip };
