import { forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";

/**
 * Compact icon button for dense rows, with an accessible label and tooltip.
 * `label` doubles as aria-label and tooltip text.
 */
const IconButton = forwardRef(function IconButton(
  { icon: Icon, label, variant = "ghost", size = "icon-sm", tooltipSide = "top", className, ...props },
  ref,
) {
  const button = (
    <Button ref={ref} variant={variant} size={size} aria-label={label} className={className} {...props}>
      {Icon ? <Icon /> : null}
    </Button>
  );
  return label ? (
    <Tooltip content={label} side={tooltipSide}>
      {button}
    </Tooltip>
  ) : (
    button
  );
});

export { IconButton };
