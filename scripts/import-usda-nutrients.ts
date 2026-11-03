/**
 * Store USDA FoodData Central nutrients for our curated foods, and feed the
 * sugars USDA measures (excess fructose, lactose) into the FODMAP rating.
 * USDA is a source for foods we already have; no USDA foods are added.
 *
 * Inputs (from the matching step):
 *   matches.json   [{ food, fdcId, dataType, description, confidence, note }]
 *   nutrients.json { "<fdcId>": { description, dataType, per100g: { energy_kcal, fructose_g, ... } } }
 *
 *   npx tsx scripts/import-usda-nutrients.ts matches.json nutrients.json [--apply]
 *
 * Low-confidence matches are skipped. FODMAP rows are added only for
 * high-confidence matches, and only for sugars USDA actually reports
 * (missing is not zero). Lactose counts toward ratings. Excess fructose is
 * stored as an admin cross-check only: it's fructose minus glucose, a small
 * difference of two averaged numbers, and on USDA data it wrongly makes
 * grapes, kiwi and berries high (Monash's lab rates them low).
 * Safe to re-run. Dry run by default.
 */
import { readFileSync, existsSync } from "fs";
import path from "path";

const envPath = path.join(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { foodMeasurements, foodNutrients, foods, trustedSources } from "@/lib/db/schema";
import { recomputeFoodProperty } from "@/lib/food-data/sync";

interface Match {
  food: string;
  fdcId: number | null;
  dataType: string | null;
  description: string;
  confidence: "high" | "medium" | "low";
  note?: string;
}
interface NutrientRecord {
  description: string;
  dataType: string;
  per100g: Record<string, number>;
}

const SOURCE = "USDA FoodData Central";
const CHECK_SOURCE = "USDA FoodData Central — fructose check";
const CREATED_BY = "import:usda";
const round3 = (n: number) => Math.round(n * 1000) / 1000;

async function main() {
  const [matchFile, nutrientFile] = process.argv.slice(2, 4);
  const apply = process.argv.includes("--apply");
  if (!matchFile || !nutrientFile) throw new Error("Usage: import-usda-nutrients.ts matches.json nutrients.json [--apply]");
  const matches = JSON.parse(readFileSync(matchFile, "utf8")) as Match[];
  const nutrients = JSON.parse(readFileSync(nutrientFile, "utf8")) as Record<string, NutrientRecord>;
  console.log(`${apply ? "APPLYING" : "DRY RUN"}: ${matches.length} matches\n`);

  let [source] = await db.select().from(trustedSources).where(eq(trustedSources.name, SOURCE)).limit(1);
  if (!source && apply) {
    [source] = await db
      .insert(trustedSources)
      .values({
        name: SOURCE,
        url: "https://fdc.nal.usda.gov",
        trustedFor: ["fodmap"],
        useAs: "data",
        notes: "US government data (public domain). Fructose, glucose and lactose per 100 g from each food's matched record; excess fructose = fructose − glucose.",
        createdBy: CREATED_BY,
      })
      .returning();
  }

  let [checkSource] = await db.select().from(trustedSources).where(eq(trustedSources.name, CHECK_SOURCE)).limit(1);
  if (!checkSource && apply) {
    [checkSource] = await db
      .insert(trustedSources)
      .values({
        name: CHECK_SOURCE,
        url: "https://fdc.nal.usda.gov",
        trustedFor: ["fodmap"],
        useAs: "check",
        notes: "Excess fructose (fructose − glucose) from USDA averages. Admin cross-check only: too imprecise to rate fruit (makes grapes, kiwi, berries high).",
        createdBy: CREATED_BY,
      })
      .returning();
  }

  const counts = { stored: 0, skippedLow: 0, noMatch: 0, missing: 0, fodmapRows: 0 };
  const touched: string[] = [];

  for (const m of matches) {
    if (!m.fdcId) {
      counts.noMatch++;
      continue;
    }
    if (m.confidence === "low") {
      counts.skippedLow++;
      continue;
    }
    const rec = nutrients[String(m.fdcId)];
    const [food] = await db
      .select({ id: foods.id })
      .from(foods)
      .where(and(eq(foods.displayName, m.food), eq(foods.source, "curated")));
    if (!rec || !food) {
      counts.missing++;
      console.log(`! ${m.food}: ${!food ? "not in catalog" : "no nutrient record"}`);
      continue;
    }

    counts.stored++;
    if (apply) {
      const values = {
        foodId: food.id,
        fdcId: m.fdcId,
        dataType: rec.dataType,
        description: rec.description,
        per100g: rec.per100g,
        matchConfidence: m.confidence,
        matchNote: m.note ?? null,
        fetchedAt: new Date(),
      };
      await db.insert(foodNutrients).values(values).onConflictDoUpdate({ target: foodNutrients.foodId, set: values });
    }

    // FODMAP: only sugars USDA reports, only for high-confidence matches.
    if (m.confidence !== "high") continue;
    const p = rec.per100g;
    const rows: { component: string; value: number; sample: string }[] = [];
    if (p.fructose_g !== undefined && p.glucose_g !== undefined) {
      rows.push({
        component: "excess_fructose",
        value: round3(Math.max(0, p.fructose_g - p.glucose_g)),
        sample: `${rec.description} — fructose ${p.fructose_g} g − glucose ${p.glucose_g} g per 100 g`,
      });
    }
    if (p.lactose_g !== undefined) {
      rows.push({ component: "lactose", value: round3(p.lactose_g), sample: `${rec.description} — lactose ${p.lactose_g} g per 100 g` });
    }
    if (!rows.length) continue;

    const citation = `USDA FoodData Central. ${rec.description}. ${rec.dataType}, FDC ID ${m.fdcId}.`;
    const existing = source && checkSource
      ? await db
          .select({ component: foodMeasurements.component })
          .from(foodMeasurements)
          .where(
            and(
              eq(foodMeasurements.foodId, food.id),
              eq(foodMeasurements.property, "fodmap"),
              eq(foodMeasurements.citation, citation)
            )
          )
      : [];
    for (const r of rows) {
      if (existing.some((e) => e.component === r.component)) continue;
      counts.fodmapRows++;
      const src = r.component === "excess_fructose" ? checkSource : source;
      if (apply && src) {
        await db.insert(foodMeasurements).values({
          foodId: food.id,
          property: "fodmap",
          component: r.component,
          valuePer100g: r.value,
          unit: "g",
          preparation: null,
          sampleDescription: r.sample,
          sourceId: src.id,
          citation,
          citationUrl: `https://fdc.nal.usda.gov/food-details/${m.fdcId}/nutrients`,
          studyYear: null,
          createdBy: CREATED_BY,
        });
      }
    }
    touched.push(food.id);
  }

  if (apply) {
    for (const id of touched) await recomputeFoodProperty(id, "fodmap");
  }
  console.log(
    `${apply ? "Stored" : "Would store"} nutrients for ${counts.stored} foods; ${counts.fodmapRows} FODMAP rows; ` +
      `${counts.skippedLow} low-confidence skipped; ${counts.noMatch} no USDA match; ${counts.missing} problems.`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
