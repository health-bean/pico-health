import type { Flag, Level } from "./compute";

export const LEVEL_LABELS: Record<Level, string> = {
  none: "None",
  low: "Low",
  moderate: "Moderate",
  high: "High",
  very_high: "Very high",
};

export const FLAG_LABELS: Record<Flag, string> = {
  studies_disagree: "Studies disagree",
  one_test: "One test only",
  no_serving_size: "Needs serving size",
  no_rule: "No ranking rule yet",
  lists_disagree: "Pending list disagrees",
  pending_list_only: "Only a pending list rates it",
};

/** Badge colour for a level, using the app's level tokens. */
export function levelVariant(level: Level | null): "allowed" | "moderation" | "avoid" | "default" {
  if (level === "high" || level === "very_high") return "avoid";
  if (level === "moderate") return "moderation";
  if (level === "low" || level === "none") return "allowed";
  return "default";
}
