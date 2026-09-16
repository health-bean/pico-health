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

const PROPERTY_DESCRIPTIONS: Record<string, string> = {
  nightshade: "Nightshades contain alkaloids that may trigger inflammation in sensitive individuals. Common nightshades include tomatoes, peppers, eggplant, and potatoes.",
  histamine: "Histamine is a compound involved in immune responses. High-histamine foods can trigger symptoms like headaches, hives, or digestive issues in those with histamine intolerance.",
  oxalate: "Oxalates are naturally occurring compounds that can contribute to kidney stones and may cause inflammation in sensitive individuals.",
  lectin: "Lectins are proteins that can interfere with nutrient absorption and may trigger digestive issues or inflammation in some people.",
  fodmap: "FODMAPs are fermentable carbohydrates that can cause digestive symptoms like bloating, gas, and pain in people with IBS.",
  salicylate: "Salicylates are natural chemicals found in many plants. High levels can trigger symptoms in salicylate-sensitive individuals.",
  amines: "Amines are compounds formed during food fermentation or aging. They can trigger headaches and other symptoms in sensitive individuals.",
  glutamates: "Glutamates are amino acids that can act as excitatory neurotransmitters. High levels may trigger symptoms in MSG-sensitive individuals.",
  sulfites: "Sulfites are preservatives that can trigger asthma-like symptoms, headaches, or digestive issues in sensitive individuals.",
  goitrogens: "Goitrogens can interfere with thyroid function by blocking iodine absorption. Important for those with thyroid conditions.",
  purines: "Purines break down into uric acid and can trigger gout attacks or worsen symptoms in those with high uric acid levels.",
  phytoestrogens: "Phytoestrogens are plant compounds that mimic estrogen. They may affect hormone-sensitive conditions.",
  phytates: "Phytates can bind to minerals and reduce their absorption. May be a concern for those with mineral deficiencies.",
  tyramine: "Tyramine can trigger migraines and interact with certain medications (MAOIs). Found in aged, fermented, or spoiled foods.",
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
      <p className="mt-3 text-xs text-warm-500">
        Tap a property to read what it means
      </p>
    </div>
  );
}
