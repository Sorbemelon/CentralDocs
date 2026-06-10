import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

const GAP = 6;

/**
 * Minimal hover/focus tooltip rendered through a fixed-position portal so it
 * is never clipped by scroll containers or panel overflow (z-40; dialogs z-50).
 */
function Tooltip({ content, side = "top", className, children }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const anchorRef = useRef(null);
  const tipRef = useRef(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current || !tipRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const tip = tipRef.current.getBoundingClientRect();
    let top;
    let left;
    if (side === "bottom") {
      top = rect.bottom + GAP;
      left = rect.left + rect.width / 2 - tip.width / 2;
    } else if (side === "left") {
      top = rect.top + rect.height / 2 - tip.height / 2;
      left = rect.left - tip.width - GAP;
    } else if (side === "right") {
      top = rect.top + rect.height / 2 - tip.height / 2;
      left = rect.right + GAP;
    } else {
      top = rect.top - tip.height - GAP;
      left = rect.left + rect.width / 2 - tip.width / 2;
    }
    // Keep inside the viewport; flip vertically when there is no room.
    if (side === "top" && top < 4) top = rect.bottom + GAP;
    if (side === "bottom" && top + tip.height > window.innerHeight - 4) top = rect.top - tip.height - GAP;
    left = Math.max(4, Math.min(left, window.innerWidth - tip.width - 4));
    setPos({ top, left });
  }, [open, side, content]);

  if (!content) return children;

  return (
    <span
      ref={anchorRef}
      className="inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open &&
        createPortal(
          <span
            ref={tipRef}
            role="tooltip"
            style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
            className={cn(
              "pointer-events-none fixed z-40 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[11px] font-medium text-popover-foreground shadow-md",
              className,
            )}
          >
            {content}
          </span>,
          document.body,
        )}
    </span>
  );
}

export { Tooltip };
