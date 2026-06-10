import { cn } from "@/lib/cn";

/** Compact empty state that teaches the next action rather than just saying "nothing here". */
function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-border bg-card/50 px-4 py-6 text-center",
        className,
      )}
    >
      {Icon && (
        <span className="mb-0.5 inline-flex size-8 items-center justify-center rounded-full bg-teal-subtle text-teal-subtle-foreground [&_svg]:size-4">
          <Icon />
        </span>
      )}
      {title && <p className="text-sm font-medium text-foreground">{title}</p>}
      {description && <p className="max-w-[34ch] text-xs text-muted-foreground">{description}</p>}
      {action && <div className="mt-1.5">{action}</div>}
    </div>
  );
}

export { EmptyState };
