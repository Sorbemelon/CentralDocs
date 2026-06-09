import { forwardRef } from "react";
import { cn } from "@/lib/cn";

const Card = forwardRef(function Card({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn("rounded-lg border border-border bg-card text-card-foreground shadow-sm", className)}
      {...props}
    />
  );
});

const CardHeader = forwardRef(function CardHeader({ className, ...props }, ref) {
  return <div ref={ref} className={cn("flex flex-col gap-1 p-3", className)} {...props} />;
});

const CardTitle = forwardRef(function CardTitle({ className, ...props }, ref) {
  return (
    <h3 ref={ref} className={cn("text-sm font-semibold leading-none tracking-tight", className)} {...props} />
  );
});

const CardDescription = forwardRef(function CardDescription({ className, ...props }, ref) {
  return <p ref={ref} className={cn("text-xs text-muted-foreground", className)} {...props} />;
});

const CardContent = forwardRef(function CardContent({ className, ...props }, ref) {
  return <div ref={ref} className={cn("p-3 pt-0", className)} {...props} />;
});

const CardFooter = forwardRef(function CardFooter({ className, ...props }, ref) {
  return <div ref={ref} className={cn("flex items-center p-3 pt-0", className)} {...props} />;
});

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
