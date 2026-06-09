import { createContext, useContext, useId, useState } from "react";
import { cn } from "@/lib/cn";

const TabsContext = createContext(null);

/** Controlled or uncontrolled tabs. */
function Tabs({ value, defaultValue, onValueChange, className, children, ...props }) {
  const [internal, setInternal] = useState(defaultValue);
  const active = value !== undefined ? value : internal;
  const baseId = useId();

  const setActive = (next) => {
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
  };

  return (
    <TabsContext.Provider value={{ active, setActive, baseId }}>
      <div className={cn("flex flex-col min-h-0", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

function TabsList({ className, ...props }) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md bg-muted p-0.5 text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({ value, className, children, ...props }) {
  const ctx = useContext(TabsContext);
  const selected = ctx.active === value;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      aria-controls={`${ctx.baseId}-panel-${value}`}
      id={`${ctx.baseId}-tab-${value}`}
      onClick={() => ctx.setActive(value)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function TabsContent({ value, className, children, ...props }) {
  const ctx = useContext(TabsContext);
  if (ctx.active !== value) return null;
  return (
    <div
      role="tabpanel"
      id={`${ctx.baseId}-panel-${value}`}
      aria-labelledby={`${ctx.baseId}-tab-${value}`}
      className={cn("min-h-0 flex-1", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
