import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

/**
 * Self-contained dropdown menu rendered through a fixed-position portal so it
 * is never clipped by scroll containers or sidebar overflow. Closes on
 * click-away, Escape, scroll, and resize. Dialogs (z-50) stay above (z-40).
 */
function DropdownMenu({ trigger, children, align = "end", className }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  // Position the portal next to the trigger; flip up near the viewport bottom.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuH = menuRef.current?.offsetHeight ?? 0;
    const menuW = menuRef.current?.offsetWidth ?? 160;
    const openUp = rect.bottom + menuH + 8 > window.innerHeight && rect.top - menuH - 8 > 0;
    const top = openUp ? rect.top - menuH - 4 : rect.bottom + 4;
    let left = align === "end" ? rect.right - menuW : rect.left;
    left = Math.max(8, Math.min(left, window.innerWidth - menuW - 8));
    setPos({ top, left });
  }, [open, align, children]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        menuRef.current &&
        !menuRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  return (
    <>
      <span
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex"
      >
        {trigger}
      </span>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            onClick={() => setOpen(false)}
            style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
            className={cn(
              "fixed z-40 min-w-40 overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md",
              className,
            )}
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  );
}

function DropdownMenuItem({ className, tone = "default", children, ...props }) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        "flex w-full items-center gap-2 rounded-[5px] px-2 py-1.5 text-left text-sm transition-colors focus-visible:outline-none disabled:opacity-50 [&_svg]:size-3.5",
        tone === "destructive"
          ? "text-destructive hover:bg-destructive-subtle"
          : "hover:bg-accent hover:text-accent-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function DropdownMenuSeparator({ className }) {
  return <div className={cn("my-1 h-px bg-border", className)} />;
}

export { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator };
