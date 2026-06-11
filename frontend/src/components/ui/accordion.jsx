import { createContext, useContext, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

const AccordionContext = createContext(null);
const ItemContext = createContext(null);

function toOpenArray(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

/** Lightweight collapsible accordion (type: "single" | "multiple"). */
function Accordion({ type = "multiple", defaultValue = [], value, onValueChange, className, children, ...props }) {
  const controlled = value !== undefined;
  const [internalOpen, setInternalOpen] = useState(() => toOpenArray(defaultValue));
  const open = controlled ? toOpenArray(value) : internalOpen;

  const updateOpen = (next) => {
    if (!controlled) setInternalOpen(next);
    if (onValueChange) onValueChange(type === "single" ? next[0] || "" : next);
  };

  const toggle = (value) => {
    const isOpen = open.includes(value);
    updateOpen(type === "single" ? (isOpen ? [] : [value]) : isOpen ? open.filter((v) => v !== value) : [...open, value]);
  };

  return (
    <AccordionContext.Provider value={{ open, toggle }}>
      <div className={cn("flex flex-col gap-2", className)} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

function AccordionItem({ value, className, children, ...props }) {
  return (
    <ItemContext.Provider value={value}>
      <div className={className} {...props}>
        {children}
      </div>
    </ItemContext.Provider>
  );
}

function useItemState() {
  const ctx = useContext(AccordionContext);
  const value = useContext(ItemContext);
  return { isOpen: ctx.open.includes(value), toggle: () => ctx.toggle(value) };
}

function AccordionTrigger({ className, children, ...props }) {
  const { isOpen, toggle } = useItemState();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-expanded={isOpen}
      className={cn(
        "flex w-full items-center justify-between gap-2 text-left text-sm font-medium transition-colors hover:text-primary focus-visible:outline-none",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDown
        className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")}
      />
    </button>
  );
}

function AccordionContent({ className, children, ...props }) {
  const { isOpen } = useItemState();
  if (!isOpen) return null;
  return (
    <div className={cn("pt-2 text-sm text-muted-foreground", className)} {...props}>
      {children}
    </div>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
