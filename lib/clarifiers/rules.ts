import type { ClarifierRule } from "./types";

/**
 * Savory / composite foods where hidden seasonings, onion/garlic, or cooking
 * oil are plausible. Fruit, grains, dairy, sweeteners etc. don't match, so a
 * banana never gets asked about paprika.
 */
const SAVORY = /meat|poultry|fish|seafood|protein|vegetable|legume|soup|stew|dish|meal|prepared|egg|curry/i;

/**
 * The clarifier rules. Shaped as data so they can move to a table later
 * without touching the engine. Order within the array is irrelevant —
 * `priority` decides which single question wins for an entry.
 */
export const CLARIFIER_RULES: readonly ClarifierRule[] = [
  {
    id: "histamine-preparation",
    dimension: "preparation",
    axes: ["histamine", "amines", "tyramine"],
    // `moderate` is exactly the "depends on freshness" class (SIGHI: fresh
    // fish is fine, day-old fish is not), so age is the question to ask there.
    minLevel: "moderate",
    question: "{food} — fresh or leftover?",
    why: "matters for histamine",
    options: [
      { value: "fresh", label: "Fresh" },
      { value: "leftover", label: "Leftover" },
      { value: "fermented", label: "Fermented" },
      { value: "aged", label: "Aged / cured" },
      { value: "canned", label: "Canned" },
    ],
    multi: false,
    priority: 10,
  },
  {
    id: "dose-quantity",
    dimension: "quantity",
    axes: ["fodmap", "oxalate", "histamine"],
    minLevel: "moderate",
    question: "{food} — how much?",
    why: "dose matters for this one",
    options: [
      { value: "less", label: "A little" },
      { value: "usual", label: "Usual" },
      { value: "more", label: "A lot" },
    ],
    multi: false,
    priority: 20,
  },
  {
    id: "nightshade-seasoning",
    dimension: "additions",
    axes: ["nightshade", "salicylate"],
    minLevel: "high",
    categoryPattern: SAVORY,
    question: "{food} — anything in the seasoning?",
    why: "spices can hide nightshades",
    options: [
      { value: "paprika_chili", label: "Paprika / chili" },
      { value: "black_pepper", label: "Black pepper" },
      { value: "cumin_coriander", label: "Cumin / coriander" },
      { value: "seed_oil", label: "Seed oil" },
      { value: "plain", label: "Plain" },
    ],
    multi: true,
    priority: 30,
  },
  {
    id: "fodmap-onion-garlic",
    dimension: "additions",
    axes: ["fodmap"],
    minLevel: "moderate",
    categoryPattern: SAVORY,
    question: "{food} — any onion or garlic?",
    why: "both are high FODMAP",
    options: [
      { value: "onion", label: "Onion" },
      { value: "garlic", label: "Garlic" },
      { value: "neither", label: "Neither" },
    ],
    multi: true,
    priority: 31,
  },
];

/** Human labels for stored answer values, used on the timeline card. */
export const ANSWER_LABELS: Record<string, string> = Object.fromEntries(
  CLARIFIER_RULES.flatMap((r) => r.options.map((o) => [o.value, o.label]))
);
