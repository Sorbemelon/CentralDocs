import { createContext, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./button";
import { Input } from "./input";

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

/** Compact confirmation dialog (async confirm shows a spinner). */
function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  onConfirm,
}) {
  const [submitting, setSubmitting] = useState(false);
  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onConfirm?.();
      onOpenChange?.(false);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={submitting ? () => {} : onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange?.(false)} disabled={submitting}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "destructive" ? "destructive" : "default"}
            size="sm"
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? <Loader2 className="animate-spin" /> : null} {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Compact single-input prompt dialog (used for rename). */
function PromptDialog({
  open,
  onOpenChange,
  title,
  label,
  defaultValue = "",
  placeholder,
  confirmLabel = "Save",
  maxLength = 120,
  onConfirm,
}) {
  const [value, setValue] = useState(defaultValue);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (open) setValue(defaultValue);
  }, [open, defaultValue]);

  const trimmed = value.trim();
  const canSave = trimmed.length > 0 && trimmed !== defaultValue.trim() && !submitting;
  const handleSave = async () => {
    if (!canSave) return;
    setSubmitting(true);
    try {
      await onConfirm?.(trimmed);
      onOpenChange?.(false);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={submitting ? () => {} : onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-1.5">
          {label && <label className="text-[12px] font-medium text-foreground">{label}</label>}
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSave();
              }
            }}
          />
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange?.(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!canSave}>
            {submitting ? <Loader2 className="animate-spin" /> : null} {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Compact option-list dialog (used for "move to folder"). */
function ChoiceDialog({ open, onOpenChange, title, description, options = [], onSelect, emptyText = "No options available." }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogBody className="flex max-h-[40vh] flex-col gap-1 overflow-auto">
          {options.length ? (
            options.map((opt) => (
              <button
                key={opt.id ?? "__root"}
                type="button"
                onClick={() => {
                  onSelect?.(opt.id);
                  onOpenChange?.(false);
                }}
                disabled={opt.disabled}
                style={opt.indentLevel ? { paddingLeft: `${0.625 + opt.indentLevel * 0.875}rem` } : undefined}
                className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-left text-[13px] text-foreground transition-colors hover:border-primary/40 hover:bg-accent/60 disabled:opacity-50"
              >
                <span className="truncate">{opt.label}</span>
              </button>
            ))
          ) : (
            <p className="px-1 py-2 text-[12px] text-muted-foreground">{emptyText}</p>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange?.(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  ConfirmDialog,
  PromptDialog,
  ChoiceDialog,
};
