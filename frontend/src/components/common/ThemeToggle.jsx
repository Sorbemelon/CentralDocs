import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { useTheme } from "@/lib/theme";

/** Light/dark toggle. Persists to localStorage via useTheme. */
function ThemeToggle({ size = "icon-sm" }) {
  const { isDark, toggleTheme } = useTheme();
  return (
    <Tooltip content={isDark ? "Switch to light" : "Switch to dark"}>
      <Button
        variant="ghost"
        size={size}
        onClick={toggleTheme}
        aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      >
        {isDark ? <Sun /> : <Moon />}
      </Button>
    </Tooltip>
  );
}

export { ThemeToggle };
