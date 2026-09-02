"use client";

import { useState } from "react";
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

function getLevelColor(level: TriggerLevel): {
  bg: string;
  text: string;
  ring: string;
} {
  switch (level) {
    case "none":
    case "low":
      return {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        ring: "ring-emerald-600/20",
      };
    case "moderate":
      return {
        bg: "bg-yellow-50",
        text: "text-yellow-700",
        ring: "ring-yellow-600/20",
      };
    case "high":
    case "very_high":
      return {
        bg: "bg-red-50",
        text: "text-red-700",
        ring: "ring-red-600/20",
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

function getBooleanColor(value: boolean): {
  bg: string;
  text: string;
  ring: string;
} {
  if (value) {
    return {
      bg: "bg-red-50",
      text: "text-red-700",
      ring: "ring-red-600/20",
    };
  }
  return {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    ring: "ring-emerald-600/20",
  };
}

function formatLevel(level: TriggerLevel): string {
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

function Tooltip({
  content,
  children,
}: {
  content: string;
  children: React.ReactNode;
}) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
      >
        {children}
      </div>
      {isVisible && (
        <div className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg border border-warm-200 bg-[var(--color-surface-card)] p-3 text-xs text-warm-700 shadow-lg">
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
    <Tooltip content={description}>
      <div
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset ${colors.bg} ${colors.text} ${colors.ring} cursor-help transition-all hover:shadow-sm`}
      >
        <span className="font-semibold">{label}:</span>
        <span>{displayValue}</span>
        <Info className="h-3 w-3 opacity-60" />
      </div>
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
        Trigger Properties
      </h3>
      <div className="flex flex-wrap gap-2">
        {propertyList.map((property, index) => (
          <PropertyBadge key={index} property={property} />
        ))}
      </div>
      <p className="mt-3 text-xs text-warm-500">
        Hover over properties for more information
      </p>
    </div>
  );
}
