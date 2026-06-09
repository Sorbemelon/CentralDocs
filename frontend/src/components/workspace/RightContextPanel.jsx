import { useState } from "react";
import { Activity, BarChart3, ChevronDown, Compass, Layers, Quote } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/cn";
import { CurrentContextCard } from "./CurrentContextCard";
import { ReferencesCard } from "./ReferencesCard";
import { ProcessingStatusCard } from "./ProcessingStatusCard";
import { DemoGuideCard } from "./DemoGuideCard";
import { UsageCard } from "./UsageCard";

/** Collapsible titled card used to stack the context panel sections. */
function CollapsibleCard({ icon: Icon, title, badge, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
      >
        {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" />}
        <span className="flex-1 text-[13px] font-semibold tracking-tight">{title}</span>
        {badge}
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

/** Right = current context, references, status, guide, usage. Does not duplicate the source tree. */
function RightContextPanel({ ws, className }) {
  return (
    <aside className={cn("flex min-h-0 flex-col border-l border-sidebar-border bg-sidebar", className)}>
      <div className="flex h-[42px] shrink-0 items-center px-3">
        <h2 className="text-sm font-semibold tracking-tight">Context</h2>
      </div>
      <ScrollArea className="flex-1 px-2.5 pb-3">
        <div className="flex flex-col gap-2.5">
          <CollapsibleCard icon={Layers} title="Current Context">
            <CurrentContextCard ws={ws} />
          </CollapsibleCard>
          <CollapsibleCard icon={Quote} title="References" defaultOpen={false}>
            <ReferencesCard />
          </CollapsibleCard>
          <CollapsibleCard icon={Activity} title="Processing Status">
            <ProcessingStatusCard ws={ws} />
          </CollapsibleCard>
          <CollapsibleCard icon={Compass} title="Demo Guide">
            <DemoGuideCard ws={ws} />
          </CollapsibleCard>
          <CollapsibleCard icon={BarChart3} title="Usage">
            <UsageCard ws={ws} />
          </CollapsibleCard>
        </div>
      </ScrollArea>
    </aside>
  );
}

export { RightContextPanel };
