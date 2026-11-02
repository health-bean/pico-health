/**
 * Import lab results from a data file (data/lab-results/*.json) into
 * food_measurements, then recompute each food's rating.
 *
 * Safe to re-run: identical results already stored are skipped. Sets a food's
 * serving size only if it has none. Dry run by default.
 *
 *   npx tsx scripts/import-lab-results.ts data/lab-results/oxalate-norton-errata-2024.json
 *   npx tsx scripts/import-lab-results.ts data/lab-results/oxalate-norton-errata-2024.json --apply
 *
 * Reads DATABASE_URL from the environment (or .env.local).
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
import { foodMeasurements, foods, trustedSources } from "@/lib/db/schema";
import { computeRating } from "@/lib/food-data/compute";
import { recomputeFoodProperty } from "@/lib/food-data/sync";
import type { FoodProperty } from "@/lib/sources/properties";

interface ResultRow {
  valuePer100g: number;
  unit: string;
  solublePct?: number | null;
  preparation?: string | null;
  sampleDescription: string;
  citation: string;
  citationUrl: string | null;
  studyYear: number | null;
  excluded?: boolean;
  exclusionNote?: string;
}

interface DataFile {
  property: FoodProperty;
  source: { name: string; url: string };
  note: string;
  foods: { food: string; servingGrams: number | null; servingLabel: string | null; results: ResultRow[] }[];
}

const CREATED_BY = "import:lab-results";

async function main() {
  const file = process.argv[2];
  const apply = process.argv.includes("--apply");
  if (!file) throw new Error("Usage: import-lab-results.ts <file.json> [--apply]");
  const data = JSON.parse(readFileSync(file, "utf8")) as DataFile;
  const property = data.property;

  console.log(`${apply ? "APPLYING" : "DRY RUN"}: ${file} (${property})\n`);

  let [source] = await db
    .select({ id: trustedSources.id })
    .from(trustedSources)
    .where(eq(trustedSources.name, data.source.name))
    .limit(1);
  if (!source) {
    console.log(`+ trusted source "${data.source.name}"`);
    if (apply) {
      [source] = await db
        .insert(trustedSources)
        .values({
          name: data.source.name,
          url: data.source.url,
          trustedFor: [property],
          useAs: "data",
          notes: data.note,
          createdBy: CREATED_BY,
        })
        .returning({ id: trustedSources.id });
    }
  }

  let added = 0;
  let skipped = 0;
  for (const entry of data.foods) {
    const matches = await db
      .select({ id: foods.id, servingGrams: foods.servingGrams })
      .from(foods)
      .where(and(eq(foods.displayName, entry.food), eq(foods.source, "curated")));
    if (matches.length !== 1) {
      console.log(`! ${entry.food}: ${matches.length} catalog matches, skipped`);
      continue;
    }
    const food = matches[0];

    if (food.servingGrams === null && entry.servingGrams) {
      if (apply) {
        await db
          .update(foods)
          .set({ servingGrams: entry.servingGrams, servingLabel: entry.servingLabel })
          .where(eq(foods.id, food.id));
      }
      food.servingGrams = entry.servingGrams;
    }

    const existing = source
      ? await db
          .select({
            citation: foodMeasurements.citation,
            value: foodMeasurements.valuePer100g,
            sample: foodMeasurements.sampleDescription,
          })
          .from(foodMeasurements)
          .where(and(eq(foodMeasurements.foodId, food.id), eq(foodMeasurements.property, property)))
      : [];

    let foodAdded = 0;
    for (const r of entry.results) {
      const dup = existing.some(
        (e) => e.citation === r.citation && e.value === r.valuePer100g && e.sample === r.sampleDescription
      );
      if (dup) {
        skipped++;
        continue;
      }
      foodAdded++;
      if (apply && source) {
        await db.insert(foodMeasurements).values({
          foodId: food.id,
          property,
          valuePer100g: r.valuePer100g,
          unit: r.unit,
          solublePct: r.solublePct ?? null,
          preparation: r.preparation ?? null,
          sampleDescription: r.sampleDescription,
          sourceId: source.id,
          citation: r.citation,
          citationUrl: r.citationUrl,
          studyYear: r.studyYear,
          excluded: r.excluded ?? false,
          exclusionNote: r.exclusionNote ?? null,
          createdBy: CREATED_BY,
        });
      }
    }
    added += foodAdded;

    const result = apply
      ? (await recomputeFoodProperty(food.id, property)).result
      : computeRating({
          property,
          servingGrams: food.servingGrams,
          measurements: entry.results.map((r, i) => ({
            id: String(i),
            valuePer100g: r.valuePer100g,
            reportedLevel: null,
            studyYear: r.studyYear,
            excluded: r.excluded ?? false,
            updatedAt: new Date(),
          })),
        });
    console.log(
      `  ${entry.food.padEnd(16)} +${foodAdded}  → ${result.level ?? "unknown"}${result.band ? ` (${result.band})` : ""}` +
        `${result.flags.length ? `  [${result.flags.join(", ")}]` : ""}`
    );
  }

  console.log(`\n${apply ? "Added" : "Would add"} ${added} results; ${skipped} already stored.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
