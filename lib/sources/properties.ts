/**
 * The food trigger properties the app tracks. Mirrors the columns of
 * food_trigger_properties; a trusted source is marked as trusted for some of these.
 */
export const FOOD_PROPERTIES = [
  "histamine",
  "amines",
  "tyramine",
  "oxalate",
  "lectin",
  "fodmap",
  "salicylate",
  "glutamates",
  "sulfites",
  "nightshade",
  "goitrogens",
  "purines",
  "phytoestrogens",
  "phytates",
] as const;

export type FoodProperty = (typeof FOOD_PROPERTIES)[number];

export const PROPERTY_LABELS: Record<FoodProperty, string> = {
  histamine: "Histamine",
  amines: "Amines",
  tyramine: "Tyramine",
  oxalate: "Oxalate",
  lectin: "Lectin",
  fodmap: "FODMAP",
  salicylate: "Salicylate",
  glutamates: "Glutamates",
  sulfites: "Sulfites",
  nightshade: "Nightshade",
  goitrogens: "Goitrogens",
  purines: "Purines",
  phytoestrogens: "Phytoestrogens",
  phytates: "Phytates",
};

export const SOURCE_USES = ["data", "reference"] as const;
export type SourceUse = (typeof SOURCE_USES)[number];
