"use client";

import { useId, useState } from "react";
import { Replace, Clock, ChevronDown } from "lucide-react";
import { FitSymbol } from "@/components/foods/FitSymbol";
import { Badge } from "@/components/ui";
import { FoodPropertyCard } from "@/components/foods/FoodPropertyCard";
import { PersonalRatingPicker } from "@/components/foods/PersonalRatingPicker";
import { ANSWER_LABELS } from "@/lib/clarifiers/rules";
import { notableProperties } from "@/lib/timeline/group-meals";
import { FIT_TONE_CLASS, fitLine, type FoodFit, type PersonalRating } from "@/lib/protocols/fit-line";
import { cn } from "@/lib/utils";
import type { FoodTriggerProperties } from "@/types";
import { EntryActions } from "./EntryActions";
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
  /** Tags the meal header already shows (every food in the meal has them); not repeated on the row. */
  sharedTags?: string[];
  onDelete?: () => void;
  /** When provided alongside onDelete, the menu also offers food/meal/time edits. */
  onPatch?: (patch: EntryPatch) => Promise<boolean>;
}

/**
 * One food inside a meal card. The row shows how the food fits the person's
 * diet and the properties worth knowing (moderate and up); tapping it opens
 * the full property list and "How is this food for you?". Its own ••• menu
 * edits or deletes just this food.
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
  onDelete,
  onPatch,
}: FoodRowProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
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
  // "Not rated yet for <diet>" on a third of rows is noise with nothing to act on; it stays out of the Log.
  const line = fullLine?.tone === "unknown" ? null : fullLine;
  const lineText = line?.text.toLowerCase() ?? "";
  // A chip that only repeats the line's reason ("Avoid on Low Histamine: high histamine") is dropped.
  const chips = notableProperties(food?.properties).filter((p) => !lineText.includes(p.label.toLowerCase()));
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
    <li className="border-t border-[var(--color-border-light)] first:border-t-0">
      <div className="flex items-start gap-1 pl-4 pr-1">
        {expandable ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={panelId}
            className="group flex min-h-12 min-w-0 flex-1 items-start gap-2 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
          >
            <span className="min-w-0 flex-1">{body}</span>
            <ChevronDown
              className={cn(
                "mt-1 h-4 w-4 shrink-0 text-warm-500 transition-transform duration-200 group-hover:text-teal-600",
                open && "rotate-180"
              )}
              aria-hidden="true"
            />
            <span className="sr-only">{open ? "Hide" : "Show"} food details</span>
          </button>
        ) : (
          <div className="min-h-12 min-w-0 flex-1 py-2.5">{body}</div>
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

      {open && expandable && (
        <div id={panelId} className="flex flex-col gap-4 border-t border-[var(--color-border-light)] px-4 py-3">
          {canRate && foodId && <PersonalRatingPicker foodId={foodId} value={personal} onChange={setPersonal} />}
          {hasProperties && food?.properties && (
            <FoodPropertyCard bare properties={food.properties as unknown as FoodTriggerProperties} />
          )}
        </div>
      )}
    </li>
  );
}
