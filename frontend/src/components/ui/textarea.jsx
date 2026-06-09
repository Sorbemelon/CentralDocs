import { forwardRef } from "react";
import { cn } from "@/lib/cn";

const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[72px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm transition-colors",
        "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50 resize-y",
        className,
      )}
      {...props}
    />
  );
});

export { Textarea };
