import { twMerge } from "tailwind-merge";

/**
 * Join class names and resolve Tailwind conflicts, so a caller's override
 * (say, text-danger-strong) replaces a component default (text-white)
 * instead of both applying.
 */
export function cn(...classes: (string | boolean | undefined | null)[]) {
  return twMerge(classes.filter(Boolean).join(" "));
}
