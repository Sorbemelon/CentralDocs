import { cn } from "@/lib/cn";

const ICON_SRC = "/brand/centraldocs_icon_light_transparent.png";

const SIZES = {
  sm: { icon: "size-6", text: "text-sm" },
  md: { icon: "size-8", text: "text-lg" },
  lg: { icon: "size-10", text: "text-2xl" },
  xl: { icon: "size-16", text: "text-4xl" },
};

/**
 * CentralDocs logo. Split wordmark: "Central" in ink, "Docs" in the brand
 * green-teal (matches the icon-with-name asset). `withName` shows the wordmark.
 */
function Logo({ withName = true, size = "md", className }) {
  const cfg = SIZES[size] || SIZES.md;

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <img src={ICON_SRC} alt="" aria-hidden="true" className={cn(cfg.icon, "object-contain")} />
      {withName && (
        <span className={cn("font-semibold tracking-tight text-foreground", cfg.text)}>
          Central<span className="text-wordmark">Docs</span>
        </span>
      )}
    </span>
  );
}

export { Logo };
