"use client";

import { useId, useState } from "react";
import { Info } from "lucide-react";
import type { FoodTriggerProperties, TriggerLevel } from "@/types";

interface FoodPropertyCardProps {
  properties: FoodTriggerProperties;
  className?: string;
}

interface PropertyInfo {
  label: string;
  description: string;
  value: boolean | TriggerLevel;
  type: "boolean" | "level";
}

/**
 * What each property is, and which eating approach limits it. These describe
 * the food and report what a protocol or published food list says: they do not
 * claim a food causes a condition, and nothing here is reviewed by a clinician.
 */
const PROPERTY_DESCRIPTIONS: Record<string, string> = {
  nightshade: "Nightshades are a plant family: tomatoes, peppers, eggplant, potatoes. They are excluded on AIP and on elimination diets that test for them. Some people report joint or gut symptoms on days they eat them.",
  histamine: "Histamine occurs naturally in food and builds up as food ages or ferments. Low-histamine diets, which follow lists like SIGHI's, limit high-histamine foods. Some people report headaches, flushing, or gut symptoms.",
  oxalate: "Oxalate is a compound found in many plants, highest in leafy greens, nuts, and some roots. Low-oxalate diets limit these foods. Talk to your practitioner before lowering oxalate, especially if you have had kidney stones.",
  lectin: "Lectins are plant proteins, highest in legumes, grains, and some nightshades, and much lower once food is soaked or cooked. Lectin-limiting diets avoid them. Some people report digestive symptoms.",
  fodmap: "FODMAPs are fermentable carbohydrates found in wheat, onion, garlic, some fruit, and dairy. The low-FODMAP diet, developed at Monash University, limits them in a structured elimination and reintroduction.",
  salicylate: "Salicylates are natural plant chemicals, highest in herbs, spices, and some fruit. The RPAH elimination diet limits them. Some people report symptoms on high-salicylate days.",
  amines: "Amines form as food ages, ferments, or is cured. The RPAH elimination diet limits them, alongside salicylates and glutamates. Some people report headaches.",
  glutamates: "Free glutamates occur naturally in aged cheese, tomato, and broth, and are added as MSG. The RPAH elimination diet limits them. Some people report symptoms after high-glutamate meals.",
  sulfites: "Sulfites are preservatives, common in dried fruit, wine, and some processed foods. They are limited on several elimination diets, and people with asthma are often advised to watch them.",
  goitrogens: "Goitrogens are compounds in raw cruciferous vegetables and soy that can affect how the thyroid uses iodine; cooking reduces them. If you have a thyroid condition, ask your practitioner what applies to you.",
  purines: "Purines are compounds found in organ meats, some seafood, and some legumes, which the body breaks down into uric acid. Low-purine diets limit them. People managing gout are often advised to track them.",
  phytoestrogens: "Phytoestrogens are plant compounds with a structure similar to estrogen, highest in soy and flax. Some hormone-focused protocols limit them.",
  phytates: "Phytates are compounds in grains, legumes, nuts, and seeds that bind minerals such as iron and zinc; soaking, sprouting, and cooking reduce them.",
  tyramine: "Tyramine forms as food ages, ferments, or is cured. Low-tyramine diets limit it, and it is the property most often flagged for people taking MAOI medication. Some people report migraines.",
};

const PROPERTY_LABELS: Record<string, string> = {
  nightshade: "Nightshade",
  histamine: "Histamine",
  oxalate: "Oxalate",
  lectin: "Lectin",
  fodmap: "FODMAP",
  salicylate: "Salicylate",
  amines: "Amines",
  glutamates: "Glutamates",
  sulfites: "Sulfites",
  goitrogens: "Goitrogens",
  purines: "Purines",
  phytoestrogens: "Phytoestrogens",
  phytates: "Phytates",
  tyramine: "Tyramine",
};

/** Level colors climb one ramp; the level word on the tag carries the meaning. */
export function getLevelColor(level: TriggerLevel): {
  bg: string;
  text: string;
  ring: string;
} {
  switch (level) {
    case "none":
    case "low":
      return {
        bg: "bg-level-1-bg",
        text: "text-level-1-fg",
        ring: "ring-level-1-fg/20",
      };
    case "moderate":
      return {
        bg: "bg-level-2-bg",
        text: "text-level-2-fg",
        ring: "ring-level-2-fg/20",
      };
    case "high":
      return {
        bg: "bg-level-3-bg",
        text: "text-level-3-fg",
        ring: "ring-level-3-fg/20",
      };
    case "very_high":
      return {
        bg: "bg-level-4-bg",
        text: "text-level-4-fg",
        ring: "ring-level-4-fg/20",
      };
    case "unknown":
    default:
      return {
        bg: "bg-warm-50",
        text: "text-warm-600",
        ring: "ring-warm-500/20",
      };
  }
}

export function getBooleanColor(value: boolean): {
  bg: string;
  text: string;
  ring: string;
} {
  if (value) {
    return {
      bg: "bg-level-3-bg",
      text: "text-level-3-fg",
      ring: "ring-level-3-fg/20",
    };
  }
  return {
    bg: "bg-level-1-bg",
    text: "text-level-1-fg",
    ring: "ring-level-1-fg/20",
  };
}

export function formatLevel(level: TriggerLevel): string {
  switch (level) {
    case "none":
      return "None";
    case "low":
      return "Low";
    case "moderate":
      return "Moderate";
    case "high":
      return "High";
    case "very_high":
      return "Very High";
    case "unknown":
    default:
      return "Unknown";
  }
}

/** Explanation on hover, focus, or tap; the trigger is a button so a keyboard reaches it. */
function Tooltip({
  content,
  label,
  children,
}: {
  content: string;
  label: string;
  children: React.ReactNode;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const id = useId();

  return (
    <div className="relative inline-block">
      <button
        type="button"
        aria-label={`About ${label}`}
        aria-expanded={isVisible}
        aria-describedby={isVisible ? id : undefined}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        onClick={() => setIsVisible((v) => !v)}
        className="min-h-9 rounded-full"
      >
        {children}
      </button>
      {isVisible && (
        <div
          id={id}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg border border-warm-200 bg-[var(--color-surface-card)] p-3 text-sm leading-snug text-warm-700 shadow-[var(--shadow-float)]"
        >
          <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-warm-200 bg-[var(--color-surface-card)]" />
          {content}
        </div>
      )}
    </div>
  );
}

function PropertyBadge({ property }: { property: PropertyInfo }) {
  const { label, description, value, type } = property;

  // Skip if value is unknown or not applicable
  if (type === "level" && (value === "unknown" || !value)) {
    return null;
  }

  const colors =
    type === "boolean"
      ? getBooleanColor(value as boolean)
      : getLevelColor(value as TriggerLevel);

  const displayValue =
    type === "boolean"
      ? (value as boolean)
        ? "Yes"
        : "No"
      : formatLevel(value as TriggerLevel);

  return (
    <Tooltip content={description} label={label}>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset ${colors.bg} ${colors.text} ${colors.ring} transition-shadow hover:shadow-[var(--shadow-card)]`}
      >
        <span className="font-semibold">{label}:</span>
        <span>{displayValue}</span>
        <Info className="h-3 w-3 opacity-60" aria-hidden="true" />
      </span>
    </Tooltip>
  );
}

export function FoodPropertyCard({
  properties,
  className = "",
}: FoodPropertyCardProps) {
  // Build array of properties to display
  const propertyList: PropertyInfo[] = [];

  // Add nightshade (boolean)
  if (properties.nightshade !== undefined) {
    propertyList.push({
      label: PROPERTY_LABELS.nightshade,
      description: PROPERTY_DESCRIPTIONS.nightshade,
      value: properties.nightshade,
      type: "boolean",
    });
  }

  // Add level-based properties
  const levelProperties: Array<keyof FoodTriggerProperties> = [
    "histamine",
    "oxalate",
    "lectin",
    "fodmap",
    "salicylate",
    "amines",
    "glutamates",
    "sulfites",
    "goitrogens",
    "purines",
    "phytoestrogens",
    "phytates",
    "tyramine",
  ];

  for (const key of levelProperties) {
    const value = properties[key];
    if (value && value !== "unknown") {
      propertyList.push({
        label: PROPERTY_LABELS[key],
        description: PROPERTY_DESCRIPTIONS[key],
        value: value as TriggerLevel,
        type: "level",
      });
    }
  }

  // If no properties to display, show a message
  if (propertyList.length === 0) {
    return (
      <div
        className={`rounded-lg border border-warm-200 bg-warm-50 p-4 text-center ${className}`}
      >
        <p className="text-sm text-warm-500">
          No trigger property information available for this food.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border border-warm-200 bg-[var(--color-surface-card)] p-4 ${className}`}
    >
      <h3 className="mb-3 text-sm font-semibold text-warm-900">
        Trigger properties
      </h3>
      <div className="flex flex-wrap gap-2">
        {propertyList.map((property, index) => (
          <PropertyBadge key={index} property={property} />
        ))}
      </div>
      <p className="mt-3 text-sm text-warm-500">
        Tap a property to read what it means. Levels come from published food lists (SIGHI,
        RPAH, Monash, Harvard) and have not been reviewed by a clinician. They describe the
        food, not a diagnosis.
      </p>
    </div>
  );
}
