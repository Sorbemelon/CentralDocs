import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge conditional class names and resolve Tailwind conflicts.
 * Single source of truth for className composition across the app.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
