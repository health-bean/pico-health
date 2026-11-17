"use client";

import { useId, useState } from "react";
import { Info } from "lucide-react";
import type { FoodTriggerProperties, TriggerLevel } from "@/types";

interface FoodPropertyCardProps {
  properties: FoodTriggerProperties;
  className?: string;
  /** Inside another card (a Log meal): no border, fill or padding of its own. */
  bare?: boolean;
}

interface PropertyInfo {
  label: string;
  description: string;
  value: boolean | TriggerLevel;
  type: "boolean" | "level";
}

const LEVEL_ORDER: Record<string, number> = { very_high: 4, high: 3, moderate: 1 };

/**
 * What matters first: very high, high, a "yes" (nightshade, releases
 * histamine), then moderate. Low, none and "no" fold into one quiet line,
 * so "Nightshade: No" never sits at the same size as "Oxalate: very high".
 */
export function arrangeProperties<T extends { label: string; value: boolean | TriggerLevel; type: "boolean" | "level" }>(
  list: T[]
): { notable: T[]; quiet: string[] } {
  const rank = (p: T) => (p.type === "boolean" ? (p.value ? 2 : 0) : (LEVEL_ORDER[p.value as string] ?? 0));
  const notable = list.filter((p) => rank(p) > 0).sort((a, b) => rank(b) - rank(a));
  const quiet = list.filter((p) => rank(p) === 0).map((p) => (p.label === "FODMAP" ? p.label : p.label.toLowerCase()));
  return { notable, quiet };
}

/**
 * What each property is, and which eating approach limits it. These describe
 * the food and report what a protocol or published food list says: they do not
 * claim a food causes a condition, and nothing here is reviewed by a clinician.
 */
const PROPERTY_DESCRIPTIONS: Record<string, string> = {
  nightshade: "Nightshades are a plant family: tomatoes, peppers, eggplant, potatoes. They are excluded on AIP and on elimination diets that test for them. Some people report joint or gut symptoms on days they eat them.",
  histamine_liberator: "Some clinical reviews list this food as possibly triggering the body to release its own histamine, even though the food itself contains little. This comes from clinical experience, not lab tests, and the evidence is limited, so low-histamine diets often suggest testing your own tolerance rather than avoiding it.",
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
  histamine_liberator: "May release histamine",
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
      return "Very high";
    case "unknown":
    default:
      return "Unknown";
  }
}

/** How a "none" rating reads: "No FODMAPs", "Histamine: not detected". */
export function noneLabel(label: string): string {
  if (label === "FODMAP") return "No FODMAPs";
  if (label === "Histamine" || label === "Tyramine") return `${label}: not detected`;
  return `${label}: none`;
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
        className="group inline-flex min-h-11 items-center focus-visible:outline-none"
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
  // "FODMAP: None" reads like "no information"; say what it means instead.
  const noneText = type === "level" && value === "none" ? noneLabel(label) : null;

  return (
    <Tooltip content={description} label={label}>
      <span
        className={`inline-flex h-8 items-center gap-1.5 rounded-sm px-2.5 text-xs font-medium ring-1 ring-inset ${colors.bg} ${colors.text} ${colors.ring} group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-teal-500`}
      >
        {noneText ? (
          <span className="font-semibold">{noneText}</span>
        ) : (
          <>
            <span className="font-semibold">{label}:</span>
            <span>{displayValue.toLowerCase()}</span>
          </>
        )}
        <Info className="h-3 w-3 opacity-60" aria-hidden="true" />
      </span>
    </Tooltip>
  );
}

export function FoodPropertyCard({
  properties,
  className = "",
  bare = false,
}: FoodPropertyCardProps) {
  const box = bare ? "" : "rounded-lg border border-warm-200 p-4";
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

  // Only shown when listed: "not listed" isn't evidence it's fine.
  if (properties.histamine_liberator) {
    propertyList.push({
      label: PROPERTY_LABELS.histamine_liberator,
      description: PROPERTY_DESCRIPTIONS.histamine_liberator,
      value: true,
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
        className={`${box} ${bare ? "" : "bg-warm-50 text-center"} ${className}`}
      >
        <p className="text-sm text-warm-500">
          No trigger property information available for this food.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`${box} ${bare ? "" : "bg-[var(--color-surface-card)]"} ${className}`}
    >
      <h3 className="text-sm font-semibold text-warm-900">What&rsquo;s in it</h3>
      {(() => {
        const { notable, quiet } = arrangeProperties(propertyList);
        return (
          <>
            {notable.length > 0 && (
              <div className="flex flex-wrap gap-x-1.5">
                {notable.map((property) => (
                  <PropertyBadge key={property.label} property={property} />
                ))}
              </div>
            )}
            {quiet.length > 0 && (
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">Low or none: {quiet.join(", ")}</p>
            )}
          </>
        );
      })()}
      <p className="mt-2 text-xs text-[var(--color-text-muted)]">
        From published lab studies and public health data. Not yet reviewed by a clinician.
      </p>
    </div>
  );
}
