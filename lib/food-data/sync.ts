/**
 * Recompute one food + property from its stored lab results and write the
 * rating into food_trigger_properties, which the rest of the app (coach,
 * clarifiers, protocols, insights) already reads.
 */
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  foodMeasurements,
  foodPropertyReviews,
  foodTriggerProperties,
  foods,
  trustedSources,
} from "@/lib/db/schema";
import type { FoodProperty } from "@/lib/sources/properties";
import { computeRating, type RatingResult } from "./compute";

type Citation = { source: string; ref?: string; note?: string };

/** The rows behind one food + property, with source names, newest first. */
export async function loadMeasurements(foodId: string, property: FoodProperty) {
  return db
    .select({
      id: foodMeasurements.id,
      property: foodMeasurements.property,
      valuePer100g: foodMeasurements.valuePer100g,
      unit: foodMeasurements.unit,
      reportedLevel: foodMeasurements.reportedLevel,
      solublePct: foodMeasurements.solublePct,
      preparation: foodMeasurements.preparation,
      sampleDescription: foodMeasurements.sampleDescription,
      sourceId: foodMeasurements.sourceId,
      sourceName: trustedSources.name,
      sourceUse: trustedSources.useAs,
      citation: foodMeasurements.citation,
      citationUrl: foodMeasurements.citationUrl,
      studyYear: foodMeasurements.studyYear,
      excluded: foodMeasurements.excluded,
      exclusionNote: foodMeasurements.exclusionNote,
      createdBy: foodMeasurements.createdBy,
      updatedAt: foodMeasurements.updatedAt,
    })
    .from(foodMeasurements)
    .innerJoin(trustedSources, eq(trustedSources.id, foodMeasurements.sourceId))
    .where(and(eq(foodMeasurements.foodId, foodId), eq(foodMeasurements.property, property)));
}

function amountNote(result: RatingResult): string {
  if (result.amount === null) return "";
  if (result.band === "ND") return ": not detected";
  const main = `${round(result.amount)} ${result.amountUnit}`;
  const serving =
    result.perServing !== null && !result.amountUnit?.includes("serving")
      ? ` (about ${round(result.perServing)} mg per serving)`
      : "";
  return `: ${main}${serving}`;
}

/** "not detected to 5130 mg/kg" for an override's note. */
function rangeNote(result: RatingResult): string {
  const [lo, hi] = result.range!;
  const perKg = result.amountUnit === "mg/kg";
  const fmt = (v: number) => (perKg ? round(v * 10) : round(v));
  const unit = perKg ? "mg/kg" : "mg per 100 g";
  return `${lo === 0 ? "not detected" : fmt(lo)} to ${fmt(hi)} ${unit}`;
}

const round = (n: number) => (n >= 10 ? Math.round(n).toString() : n.toFixed(1).replace(/\.0$/, ""));

/** One-line provenance stored next to the rating, e.g. for the coach to quote. */
export function citationFor(
  result: RatingResult,
  rows: {
    id: string;
    sourceName: string;
    sourceUse: string;
    citation: string;
    studyYear: number | null;
    excluded: boolean;
  }[]
): Citation | null {
  if (result.level === null) return null;
  // Permission-pending sources are never cited to users.
  const counted = rows.filter(
    (r) => !r.excluded && r.sourceUse !== "check" && !result.superseded.includes(r.id)
  );
  const sources = [...new Set(counted.map((r) => r.sourceName))].join(", ");
  const refs = counted.map((r) => (r.studyYear ? `${r.citation.split(".")[0]} (${r.studyYear})` : r.citation.split(".")[0]));
  const ref = refs.length > 3 ? `${refs.slice(0, 3).join("; ")}; +${refs.length - 3} more` : refs.join("; ");
  const note = result.flags.includes("admin_override")
    ? `Results vary widely across ${result.counted} lab test${result.counted === 1 ? "" : "s"}${
        result.range ? ` (${rangeNote(result)})` : ""
      }; rated on the higher results`
    : result.method === "median"
      ? `Middle value of ${result.counted} lab test${result.counted === 1 ? "" : "s"}${amountNote(result)}`
      : `As rated by ${sources}`;
  return { source: sources, ref: ref.slice(0, 500), note };
}

export async function recomputeFoodProperty(foodId: string, property: FoodProperty) {
  const [food] = await db
    .select({ servingGrams: foods.servingGrams })
    .from(foods)
    .where(eq(foods.id, foodId))
    .limit(1);
  if (!food) throw new Error(`Food ${foodId} not found`);

  const rows = await loadMeasurements(foodId, property);
  const [review] = await db
    .select({ reviewedAt: foodPropertyReviews.reviewedAt, overrideLevel: foodPropertyReviews.overrideLevel })
    .from(foodPropertyReviews)
    .where(and(eq(foodPropertyReviews.foodId, foodId), eq(foodPropertyReviews.property, property)))
    .limit(1);

  const result = computeRating({
    property,
    servingGrams: food.servingGrams,
    measurements: rows,
    reviewedAt: review?.reviewedAt ?? null,
    overrideLevel: review?.overrideLevel ?? null,
  });

  // Nightshade is a yes/no botanical fact, not a level; it isn't computed here.
  if (property !== "nightshade") {
    const citation = citationFor(result, rows);
    const [existing] = await db
      .select({ sources: foodTriggerProperties.sources })
      .from(foodTriggerProperties)
      .where(eq(foodTriggerProperties.foodId, foodId))
      .limit(1);

    const sources = { ...(existing?.sources ?? {}) };
    if (citation) sources[property] = citation;
    else delete sources[property];

    const values = { [property]: result.level ?? "unknown", sources, updatedAt: new Date() };
    if (existing) {
      await db.update(foodTriggerProperties).set(values).where(eq(foodTriggerProperties.foodId, foodId));
    } else {
      await db.insert(foodTriggerProperties).values({ foodId, ...values });
    }
  }

  return { result, rows };
}
