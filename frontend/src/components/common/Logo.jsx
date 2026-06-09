import { cn } from "@/lib/cn";
import { APP_NAME } from "@/lib/constants";

const ICON_SRC = "/brand/centraldocs_icon_light_transparent.png";

/**
 * CentralDocs logo. `withName` shows the wordmark text next to the icon.
 * Uses the brand icon asset from public/brand/.
 */
function Logo({ withName = true, size = "md", className }) {
  const iconSize = size === "sm" ? "size-6" : size === "lg" ? "size-9" : "size-7";
  const textSize = size === "sm" ? "text-sm" : size === "lg" ? "text-xl" : "text-base";

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <img src={ICON_SRC} alt="" aria-hidden="true" className={cn(iconSize, "object-contain")} />
      {withName && (
        <span className={cn("font-semibold tracking-tight text-foreground", textSize)}>
          {APP_NAME}
        </span>
      )}
    </span>
  );
}

export { Logo };
