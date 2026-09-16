"use client";

import { useState } from "react";
import { X, Plus, Loader2 } from "lucide-react";
import type { TriggerLevel } from "@/types";

interface CustomFood {
  id: string;
  userId: string;
  displayName: string;
  category: string | null;
  subcategory: string | null;
  isArchived: boolean;
  properties?: {
    nightshade: boolean;
    histamine: TriggerLevel;
    oxalate: TriggerLevel;
    lectin: TriggerLevel;
    fodmap: TriggerLevel;
    salicylate: TriggerLevel;
    amines: TriggerLevel;
    glutamates: TriggerLevel;
    sulfites: TriggerLevel;
    goitrogens: TriggerLevel;
    purines: TriggerLevel;
    phytoestrogens: TriggerLevel;
    phytates: TriggerLevel;
    tyramine: TriggerLevel;
  };
  createdAt?: string;
  updatedAt?: string;
}

interface CustomFoodFormProps {
  onSuccess?: (food: CustomFood) => void;
  onCancel?: () => void;
  className?: string;
}

interface FormData {
  displayName: string;
  category: string;
  subcategory: string;
  properties: {
    nightshade: boolean;
    histamine: TriggerLevel;
    oxalate: TriggerLevel;
    lectin: TriggerLevel;
    fodmap: TriggerLevel;
    salicylate: TriggerLevel;
    amines: TriggerLevel;
    glutamates: TriggerLevel;
    sulfites: TriggerLevel;
    goitrogens: TriggerLevel;
    purines: TriggerLevel;
    phytoestrogens: TriggerLevel;
    phytates: TriggerLevel;
    tyramine: TriggerLevel;
  };
}

const CATEGORIES = [
  "Vegetables",
  "Fruits",
  "Proteins",
  "Grains",
  "Dairy",
  "Nuts & Seeds",
  "Legumes",
  "Oils & Fats",
  "Beverages",
  "Herbs & Spices",
  "Other",
];

const TRIGGER_LEVELS: TriggerLevel[] = [
  "unknown",
  "none",
  "low",
  "moderate",
  "high",
  "very_high",
];

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

function formatLevelLabel(level: TriggerLevel): string {
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

export function CustomFoodForm({
  onSuccess,
  onCancel,
  className = "",
}: CustomFoodFormProps) {
  const [formData, setFormData] = useState<FormData>({
    displayName: "",
    category: "",
    subcategory: "",
    properties: {
      nightshade: false,
      histamine: "unknown",
      oxalate: "unknown",
      lectin: "unknown",
      fodmap: "unknown",
      salicylate: "unknown",
      amines: "unknown",
      glutamates: "unknown",
      sulfites: "unknown",
      goitrogens: "unknown",
      purines: "unknown",
      phytoestrogens: "unknown",
      phytates: "unknown",
      tyramine: "unknown",
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Validate required fields
    if (!formData.displayName.trim()) {
      setError("Food name is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/foods/custom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName: formData.displayName.trim(),
          category: formData.category || null,
          subcategory: formData.subcategory || null,
          properties: formData.properties,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create custom food");
      }

      setSuccessMessage("Custom food created successfully!");
      
      // Clear form
      setFormData({
        displayName: "",
        category: "",
        subcategory: "",
        properties: {
          nightshade: false,
          histamine: "unknown",
          oxalate: "unknown",
          lectin: "unknown",
          fodmap: "unknown",
          salicylate: "unknown",
          amines: "unknown",
          glutamates: "unknown",
          sulfites: "unknown",
          goitrogens: "unknown",
          purines: "unknown",
          phytoestrogens: "unknown",
          phytates: "unknown",
          tyramine: "unknown",
        },
      });

      // Call success callback
      if (onSuccess) {
        onSuccess(data.food);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePropertyChange = (
    property: keyof FormData["properties"],
    value: TriggerLevel | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      properties: {
        ...prev.properties,
        [property]: value,
      },
    }));
  };

  return (
    <div className={`rounded-lg border border-warm-200 bg-[var(--color-surface-card)] p-6 ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-warm-900">
          Create Custom Food
        </h2>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1 text-warm-500 hover:bg-warm-100 hover:text-warm-600"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger-strong">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-700">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Food Name - Required */}
        <div>
          <label
            htmlFor="displayName"
            className="mb-1.5 block text-sm font-medium text-warm-700"
          >
            Food Name <span className="text-danger-strong">*</span>
          </label>
          <input
            type="text"
            id="displayName"
            value={formData.displayName}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, displayName: e.target.value }))
            }
            placeholder="e.g., Homemade Bone Broth"
            className="w-full rounded-lg border border-warm-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            required
          />
        </div>

        {/* Category - Optional */}
        <div>
          <label
            htmlFor="category"
            className="mb-1.5 block text-sm font-medium text-warm-700"
          >
            Category
          </label>
          <select
            id="category"
            value={formData.category}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, category: e.target.value }))
            }
            className="w-full rounded-lg border border-warm-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          >
            <option value="">Select a category (optional)</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Subcategory - Optional */}
        <div>
          <label
            htmlFor="subcategory"
            className="mb-1.5 block text-sm font-medium text-warm-700"
          >
            Subcategory
          </label>
          <input
            type="text"
            id="subcategory"
            value={formData.subcategory}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, subcategory: e.target.value }))
            }
            placeholder="e.g., Beef, Chicken, etc."
            className="w-full rounded-lg border border-warm-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>

        {/* Trigger Properties Section */}
        <div className="space-y-4 rounded-lg border border-warm-200 bg-warm-50 p-4">
          <h3 className="text-sm font-semibold text-warm-900">
            Trigger Properties (Optional)
          </h3>
          <p className="text-xs text-warm-600">
            Set trigger property levels if known. Leave as &ldquo;Unknown&rdquo; if unsure.
          </p>

          {/* Nightshade - Boolean */}
          <div className="flex items-center justify-between rounded-lg border border-warm-200 bg-[var(--color-surface-card)] p-3">
            <label
              htmlFor="nightshade"
              className="text-sm font-medium text-warm-700"
            >
              {PROPERTY_LABELS.nightshade}
            </label>
            <input
              type="checkbox"
              id="nightshade"
              checked={formData.properties.nightshade}
              onChange={(e) =>
                handlePropertyChange("nightshade", e.target.checked)
              }
              className="h-4 w-4 rounded border-warm-300 text-teal-600 focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          {/* Level-based properties */}
          {(
            [
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
            ] as Array<keyof FormData["properties"]>
          ).map((property) => (
            <div
              key={property}
              className="flex items-center justify-between gap-4 rounded-lg border border-warm-200 bg-[var(--color-surface-card)] p-3"
            >
              <label
                htmlFor={property}
                className="text-sm font-medium text-warm-700"
              >
                {PROPERTY_LABELS[property]}
              </label>
              <select
                id={property}
                value={formData.properties[property] as TriggerLevel}
                onChange={(e) =>
                  handlePropertyChange(property, e.target.value as TriggerLevel)
                }
                className="rounded-lg border border-warm-300 px-3 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              >
                {TRIGGER_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {formatLevelLabel(level)}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting || !formData.displayName.trim()}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Create Food
              </>
            )}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="rounded-lg border border-warm-300 px-4 py-2.5 text-sm font-medium text-warm-700 hover:bg-warm-50 focus:outline-none focus:ring-2 focus:ring-warm-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
