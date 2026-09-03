"use client";

import { Apple, AlertTriangle, Replace, Clock } from "lucide-react";
import { Badge } from "@/components/ui";
import { FoodPropertyCard } from "@/components/foods/FoodPropertyCard";
import { EntryActions } from "./EntryActions";
import { EntryEditor, type EntryEditorMode, type EntryPatch } from "./EntryEditor";
import { useState } from "react";
import { ANSWER_LABELS } from "@/lib/clarifiers/rules";
import type { FoodTriggerProperties } from "@/types";

/** Human-readable clarifier answers stored on the entry, for the detail line. */
function clarifierLabels(sc: Record<string, unknown> | null | undefined): string[] {
  if (!sc) return [];
  const out: string[] = [];
  const prep = Array.isArray(sc.preparation) ? (sc.preparation as unknown[]) : [];
  for (const p of prep) {
    if (typeof p === "string") out.push(ANSWER_LABELS[p] ?? p.charAt(0).toUpperCase() + p.slice(1));
  }
  if (typeof sc.quantity === "string" && sc.quantity !== "usual") {
    out.push(sc.quantity === "more" ? "Large portion" : "Small portion");
  }
  const adds = Array.isArray(sc.additions) ? (sc.additions as unknown[]) : [];
  for (const a of adds) {
    if (typeof a === "string" && a !== "plain" && a !== "neither") out.push(ANSWER_LABELS[a] ?? a);
  }
  return out;
}

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
  /** Entry's structured content — clarifier answers are shown from it. */
  structuredContent?: Record<string, unknown> | null;
  /** When provided, renders a trailing actions menu with Delete. */
  onDelete?: () => void;
  /** When provided alongside onDelete, the menu also offers food/meal/time edits. */
  onPatch?: (patch: EntryPatch) => Promise<boolean>;
  protocolId?: string;
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
  structuredContent,
  onDelete,
  onPatch,
  protocolId,
}: FoodTimelineCardProps) {
  const [showProperties, setShowProperties] = useState(false);
  const [editing, setEditing] = useState<EntryEditorMode | null>(null);
  const detailTags = clarifierLabels(structuredContent);

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
            {detailTags.map((tag) => (
              <span key={tag} className="contents">
                <span className="text-teal-700">{tag}</span>
                <span className="text-warm-300">•</span>
              </span>
            ))}
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

        {onDelete && (
          <EntryActions
            name={displayName}
            onDelete={onDelete}
            actions={
              onPatch
                ? [
                    { label: "Change food", icon: Replace, onSelect: () => setEditing("food") },
                    { label: "Meal or time", icon: Clock, onSelect: () => setEditing("details") },
                  ]
                : []
            }
          />
        )}
      </div>

      {editing && onPatch && (
        <EntryEditor
          mode={editing}
          entryType="food"
          name={displayName}
          mealType={mealType}
          entryTime={entryTime}
          preparation={
            Array.isArray(structuredContent?.preparation)
              ? (structuredContent.preparation as string[])
              : null
          }
          quantity={typeof structuredContent?.quantity === "string" ? structuredContent.quantity : null}
          protocolId={protocolId}
          onPatch={onPatch}
          onClose={() => setEditing(null)}
        />
      )}

      {/* Expandable properties section */}
      {showProperties && hasProperties && food?.properties && (
        <div className="border-t border-warm-200 px-4 py-3">
          <FoodPropertyCard properties={food.properties as unknown as FoodTriggerProperties} />
        </div>
      )}
    </div>
  );
}
