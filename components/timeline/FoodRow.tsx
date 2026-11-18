"use client";

import { useRef, useState } from "react";
import { Replace, Clock, ChevronRight } from "lucide-react";
import { FitSymbol } from "@/components/foods/FitSymbol";
import { Badge } from "@/components/ui";
import { ANSWER_LABELS } from "@/lib/clarifiers/rules";
import { notableProperties, propertyNoun } from "@/lib/timeline/group-meals";
import { FIT_TONE_CLASS, fitLine, showOnLog, type FoodFit, type PersonalRating } from "@/lib/protocols/fit-line";
import { cn } from "@/lib/utils";
import { EntryActions } from "./EntryActions";
import { FoodSheet } from "./FoodSheet";
import { formatClock } from "./MealCard";
import type { PropertyPatternLike } from "@/lib/foods/food-sheet";

const MEAL_LABEL: Record<string, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack" };
const mealLabel = (m: string | null | undefined) => (m ? MEAL_LABEL[m] ?? "" : "");
import { EntryEditor, type EntryEditorMode, type EntryPatch } from "./EntryEditor";

/** Human-readable clarifier answers stored on the entry, for the detail line. */
export function clarifierLabels(sc: Record<string, unknown> | null | undefined): string[] {
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

export interface FoodRowProps {
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
  /** How the food sits with the person's diet and their own rating; null when neither. */
  fit?: FoodFit | null;
  /** Catalog food id; when set (and not a custom food) the person can rate it. */
  foodId?: string | null;
  /** Entry's structured content — clarifier answers are shown from it. */
  structuredContent?: Record<string, unknown> | null;
  /** Insights' "worth keeping an eye on" patterns, for the panel's "Your log" voice. */
  patterns?: PropertyPatternLike[];
  /** Tags the meal header already shows (every food in the meal has them); not repeated on the row. */
  sharedTags?: string[];
  onDelete?: () => void;
  /** When provided alongside onDelete, the menu also offers food/meal/time edits. */
  onPatch?: (patch: EntryPatch) => Promise<boolean>;
}

/**
 * One food inside a meal. The row shows what needs attention (Limit, Avoid,
 * not rated yet, your own rating) and notable properties; tapping it opens
 * the food's panel (FoodSheet): your protocol, your log, you, what's in it.
 * Its own ••• menu edits or deletes just this food.
 */
export function FoodRow({
  name,
  portion,
  mealType,
  entryTime,
  food,
  protocolViolations = [],
  fit = null,
  foodId = null,
  structuredContent,
  sharedTags = [],
  patterns = [],
  onDelete,
  onPatch,
}: FoodRowProps) {
  // The tapped row's bottom edge while its panel is open (null when closed).
  const [sheetAt, setSheetAt] = useState<number | null>(null);
  const rowButton = useRef<HTMLButtonElement>(null);
  const [editing, setEditing] = useState<EntryEditorMode | null>(null);
  const [personal, setPersonal] = useState<PersonalRating | null>(fit?.personal ?? null);

  const displayName = food?.displayName || name;
  const details = clarifierLabels(structuredContent).filter((t) => !sharedTags.includes(t));
  // "1 serving" is the default, so it says nothing; a real portion sits beside the name.
  const portionText = portion && !/^1 serving$/i.test(portion.trim()) ? portion : null;
  const hasProperties = !!food?.properties && Object.keys(food.properties).length > 0;
  const canRate = !!foodId && !!food && !food.isCustom;
  const expandable = hasProperties || canRate;

  const fullLine = fitLine({ ...(fit ?? { diet: null, status: "allowed", reasons: [] }), personal });
  // Only what needs attention is marked; a food with no mark is allowed (lib/protocols/fit-line showOnLog).
  const line = showOnLog(fullLine, personal != null) ? fullLine : null;
  // A chip that only repeats the line's reason ("Limit · histamine" + "Moderate histamine") is dropped.
  const reasonWords = new Set((line?.reasons ?? []).map((r) => r.toLowerCase()));
  const chips = notableProperties(food?.properties).filter((p) => !reasonWords.has(propertyNoun(p.key)));
  const violations = !line && protocolViolations.length > 0
    ? protocolViolations.map((v) => v.replace(/\s+not allowed$/i, "")).join(", ")
    : null;

  const body = (
    <>
      <span className="flex flex-wrap items-center gap-2">
        <span className="text-[15px] leading-snug text-warm-900">{displayName}</span>
        {portionText && <span className="text-xs text-[var(--color-text-muted)]">{portionText}</span>}
        {food?.isCustom && <Badge variant="default">Custom</Badge>}
      </span>
      {details.length > 0 && (
        <span className="mt-0.5 block text-xs text-teal-700">{details.join(" · ")}</span>
      )}
      {line ? (
        <span className={cn("mt-0.5 flex items-start gap-1 text-xs", FIT_TONE_CLASS[line.tone].text)}>
          <FitSymbol tone={line.tone} className="mt-0.5" />
          {line.text}
        </span>
      ) : violations ? (
        <span className={cn("mt-0.5 flex items-start gap-1 text-xs", FIT_TONE_CLASS.avoid.text)}>
          <FitSymbol tone="avoid" className="mt-0.5" />
          Outside your protocol · {violations}
        </span>
      ) : null}
      {/* Neutral on purpose: the level ramp shares ochre's hue, and an amber
          "Very high oxalate" under a teal "Allowed" read as a second verdict. */}
      {chips.length > 0 && (
        <span className="mt-1 flex flex-wrap gap-1">
          {chips.map((c) => (
            <span
              key={c.key}
              className="inline-flex items-center rounded-md bg-warm-100 px-1.5 py-0.5 text-xs font-medium text-warm-700 ring-1 ring-inset ring-warm-200"
            >
              {c.label}
            </span>
          ))}
        </span>
      )}
    </>
  );

  return (
    <li>
      <div className="flex items-start gap-1">
        {expandable ? (
          <button
            ref={rowButton}
            type="button"
            onClick={(e) => setSheetAt(e.currentTarget.getBoundingClientRect().bottom)}
            aria-haspopup="dialog"
            className={cn(
              "group -ml-2 flex min-h-11 min-w-0 flex-1 items-start gap-2 rounded-lg py-1.5 pl-2 text-left transition-colors hover:bg-teal-50/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500",
              // Stays marked behind the panel, so you know which food you opened.
              sheetAt !== null && "bg-teal-50 shadow-[inset_3px_0_0_var(--color-teal-600)]"
            )}
          >
            <span className="min-w-0 flex-1">{body}</span>
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-warm-400 group-hover:text-teal-600" aria-hidden="true" />
            <span className="sr-only">Open {displayName}</span>
          </button>
        ) : (
          <div className="min-h-11 min-w-0 flex-1 py-1.5">{body}</div>
        )}

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
          preparation={Array.isArray(structuredContent?.preparation) ? (structuredContent.preparation as string[]) : null}
          quantity={typeof structuredContent?.quantity === "string" ? structuredContent.quantity : null}
          onPatch={onPatch}
          onClose={() => setEditing(null)}
        />
      )}

      {sheetAt !== null && (
        <FoodSheet
          anchorBottom={sheetAt}
          name={displayName}
          meta={[mealLabel(mealType), formatClock(entryTime), ...clarifierLabels(structuredContent)].filter(Boolean).join(" · ")}
          properties={food?.properties ?? null}
          fit={fit}
          foodId={foodId}
          canRate={canRate}
          personal={personal}
          onPersonalChange={setPersonal}
          patterns={patterns}
          onClose={() => {
            setSheetAt(null);
            rowButton.current?.focus({ preventScroll: true });
          }}
        />
      )}
    </li>
  );
}
