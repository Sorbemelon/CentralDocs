import { createContext, useContext, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

const DialogContext = createContext({ onOpenChange: () => {} });

/** Controlled dialog. Renders to a portal to escape panel stacking/overflow contexts. */
function Dialog({ open, onOpenChange, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onOpenChange?.(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return createPortal(
    <DialogContext.Provider value={{ onOpenChange }}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]"
          onClick={() => onOpenChange?.(false)}
          aria-hidden="true"
        />
        {children}
      </div>
    </DialogContext.Provider>,
    document.body,
  );
}

function DialogContent({ className, children, ...props }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className={cn(
        "relative z-10 w-full max-w-lg rounded-lg border border-border bg-card text-card-foreground shadow-lg",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function DialogClose({ className }) {
  const { onOpenChange } = useContext(DialogContext);
  return (
    <button
      type="button"
      onClick={() => onOpenChange?.(false)}
      aria-label="Close dialog"
      className={cn(
        "absolute right-3 top-3 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <X className="size-4" />
    </button>
  );
}

function DialogHeader({ className, ...props }) {
  return <div className={cn("flex flex-col gap-1 p-4 pb-2", className)} {...props} />;
}

function DialogTitle({ className, ...props }) {
  return <h2 className={cn("text-base font-semibold leading-tight", className)} {...props} />;
}

function DialogDescription({ className, ...props }) {
  return <p className={cn("text-xs text-muted-foreground", className)} {...props} />;
}

function DialogBody({ className, ...props }) {
  return <div className={cn("px-4 py-2", className)} {...props} />;
}

function DialogFooter({ className, ...props }) {
  return (
    <div className={cn("flex items-center justify-end gap-2 p-4 pt-2", className)} {...props} />
  );
}

export {
  Dialog,
  DialogContent,
  DialogClose,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
};
