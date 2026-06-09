import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Self-contained dropdown menu (no portal/Radix).
 * Click-away + Escape close. `trigger` is rendered as the toggle.
 */
function DropdownMenu({ trigger, children, align = "end", className }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex">
      <span onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>
        {trigger}
      </span>
      {open && (
        <div
          role="menu"
          onClick={() => setOpen(false)}
          className={cn(
            "absolute top-full z-30 mt-1 min-w-[10rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md",
            align === "end" ? "right-0" : "left-0",
            className,
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function DropdownMenuItem({ className, tone = "default", children, ...props }) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        "flex w-full items-center gap-2 rounded-[5px] px-2 py-1.5 text-left text-sm transition-colors focus-visible:outline-none [&_svg]:size-3.5",
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
