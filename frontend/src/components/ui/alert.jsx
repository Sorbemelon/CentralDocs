import { forwardRef } from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/cn";

const alertVariants = cva(
  "relative flex gap-2.5 rounded-md border p-3 text-sm [&>svg]:size-4 [&>svg]:mt-0.5 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-card-foreground",
        info: "border-transparent bg-teal-subtle text-teal-subtle-foreground",
        success: "border-transparent bg-success-subtle text-success-subtle-foreground",
        warning: "border-transparent bg-warning-subtle text-warning-subtle-foreground",
        destructive: "border-transparent bg-destructive-subtle text-destructive-subtle-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

const Alert = forwardRef(function Alert({ className, variant, ...props }, ref) {
  return <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
});

const AlertTitle = forwardRef(function AlertTitle({ className, ...props }, ref) {
  return <h5 ref={ref} className={cn("mb-0.5 font-semibold leading-tight", className)} {...props} />;
});

const AlertDescription = forwardRef(function AlertDescription({ className, ...props }, ref) {
  return <div ref={ref} className={cn("text-[13px] opacity-90", className)} {...props} />;
});

export { Alert, AlertTitle, AlertDescription, alertVariants };
