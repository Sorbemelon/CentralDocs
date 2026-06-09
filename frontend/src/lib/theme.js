import { useCallback, useEffect, useState } from "react";
import { STORAGE_KEYS } from "./constants";

/** "light" | "dark" */
export function getStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEYS.theme);
  } catch {
    return null;
  }
}

/** Resolve the active theme: stored value, otherwise light (the product default). */
export function resolveInitialTheme() {
  return getStoredTheme() === "dark" ? "dark" : "light";
}

/** Apply the theme to <html> by toggling the `.dark` class. */
export function applyTheme(theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
}

export function persistTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  } catch {
    /* storage may be unavailable; ignore */
  }
}

/**
 * Theme hook: returns the current theme and a toggle.
 * The no-flash class is set by an inline script in index.html before paint.
 */
export function useTheme() {
  const [theme, setTheme] = useState(resolveInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    persistTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return { theme, setTheme, toggleTheme, isDark: theme === "dark" };
}
