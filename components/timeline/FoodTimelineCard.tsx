"use client";

import { Apple, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui";
import { FoodPropertyCard } from "@/components/foods/FoodPropertyCard";
import { EntryActions } from "./EntryActions";
import { useState } from "react";
import type { FoodTriggerProperties } from "@/types";

interface FoodTimelineCardProps {
  name: string;
  portion?: string | null;
  mealType?: string | null;
  entryTime?: string | null;
  food?: {
    displayName: string;
    category: string | null;
    subcategory: string | null;
    properties: Record<string, unknown> | null;
    isCustom: boolean;
  };
  protocolViolations?: string[];
  /** When provided, renders a trailing actions button with Delete. */
  onDelete?: () => void;
}

function formatTime(time: string | null | undefined): string {
  if (!time) return "";
  try {
    const [h, m] = time.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
  } catch {
    return time;
  }
}

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export function FoodTimelineCard({
  name,
  portion,
  mealType,
  entryTime,
  food,
  protocolViolations = [],
  onDelete,
}: FoodTimelineCardProps) {
  const [showProperties, setShowProperties] = useState(false);
  
  const displayName = food?.displayName || name;
  const hasViolations = protocolViolations.length > 0;
  const hasProperties = food?.properties && Object.keys(food.properties).length > 0;

  return (
    <div className="flex flex-col rounded-xl border border-warm-200 bg-[var(--color-surface-card)]">
      {/* Main card content */}
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Icon */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
          <Apple className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-warm-900">
              {displayName}
            </span>
            <Badge variant="allowed">Food</Badge>
            {food?.isCustom && (
              <Badge variant="default">Custom</Badge>
            )}
          </div>

          {/* Details */}
          <div className="mt-1 flex items-center gap-2 flex-wrap text-xs text-warm-600">
            {portion && (
              <>
                <span className="font-medium">{portion}</span>
                <span className="text-warm-300">•</span>
              </>
            )}
            {mealType && (
              <>
                <span>{MEAL_TYPE_LABELS[mealType] || mealType}</span>
                <span className="text-warm-300">•</span>
              </>
            )}
            {food?.category && (
              <>
                <span className="text-warm-500">{food.category}</span>
                {food.subcategory && (
                  <>
                    <span className="text-warm-300">›</span>
                    <span className="text-warm-500">{food.subcategory}</span>
                  </>
                )}
                <span className="text-warm-300">•</span>
              </>
            )}
            {entryTime && (
              <span className="text-warm-400">{formatTime(entryTime)}</span>
            )}
          </div>

          {/* Protocol violations warning */}
          {hasViolations && (
            <div className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-amber-900">
                  Protocol Warning
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {protocolViolations.join(", ")}
                </p>
              </div>
            </div>
          )}

          {/* Show properties button */}
          {hasProperties && (
            <button
              onClick={() => setShowProperties(!showProperties)}
              className="mt-2 text-xs font-medium text-teal-600 hover:text-teal-700"
            >
              {showProperties ? "Hide" : "Show"} food properties
            </button>
          )}
        </div>

        {onDelete && <EntryActions name={displayName} onDelete={onDelete} />}
      </div>

      {/* Expandable properties section */}
      {showProperties && hasProperties && food?.properties && (
        <div className="border-t border-warm-200 px-4 py-3">
          <FoodPropertyCard properties={food.properties as unknown as FoodTriggerProperties} />
        </div>
      )}
    </div>
  );
}
