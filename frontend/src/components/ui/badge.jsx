import { cva } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-tight whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-border bg-secondary text-secondary-foreground",
        outline: "border-border bg-transparent text-foreground",
        muted: "border-transparent bg-muted text-muted-foreground",
        teal: "border-transparent bg-teal-subtle text-teal-subtle-foreground",
        success: "border-transparent bg-success-subtle text-success-subtle-foreground",
        warning: "border-transparent bg-warning-subtle text-warning-subtle-foreground",
        destructive: "border-transparent bg-destructive-subtle text-destructive-subtle-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
