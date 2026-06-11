import { Link } from "react-router-dom";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { BackendStatusBadge } from "@/components/common/StatusBadge";
import { cn } from "@/lib/cn";

/**
 * Shared CentralDocs top bar shell. Page-specific controls are passed as slots
 * so the landing and workspace bars keep one brand/status/theme layout.
 */
function AppTopBar({
  status,
  brandTo,
  leading,
  actionsBeforeStatus,
  actionsBeforeTheme,
  actionsAfterTheme,
  trailing,
  className,
  contentClassName,
}) {
  const brand = <Logo size="lg" />;

  return (
    <header className={cn("relative z-20 shrink-0 border-b border-border bg-card", className)}>
      <div className={cn("flex h-14 w-full items-center gap-2 px-3", contentClassName)}>
        {leading}
        {brandTo ? (
          <Link
            to={brandTo}
            className="flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {brand}
          </Link>
        ) : (
          brand
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {actionsBeforeStatus}
          {status !== undefined && <BackendStatusBadge status={status} className="hidden sm:inline-flex" />}
          {actionsBeforeTheme}
          <ThemeToggle />
          {actionsAfterTheme}
          {trailing}
        </div>
      </div>
    </header>
  );
}

export { AppTopBar };
