/**
 * Import a food list's ratings as a PERMISSION-PENDING check: stored admin-only
 * next to our lab data so we can see where lists disagree. They never count
 * toward a rating, are never cited, and never reach users (see compute.ts).
 *
 * Input: a JSON file of { property, source, termsNotice, entries[] } where each
 * entry has listName, listCategory, level, food (exact catalog name or null),
 * page. Entries without a catalog match or a level are skipped and listed.
 *
 *   npx tsx scripts/import-list-checks.ts <file.json> --source "<source name>" [--notes "..."] [--apply]
 *
 * The named source is created (or switched) to use_as = 'check'. Safe to
 * re-run: identical rows are skipped. Dry run by default.
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
import { FOOD_PROPERTIES, type FoodProperty } from "@/lib/sources/properties";

const LEVELS = ["none", "low", "moderate", "high", "very_high"];
const CREATED_BY = "import:list-check";

interface Entry {
  listName: string;
  listCategory: string;
  level: string | null;
  food: string | null;
  page?: number | null;
  deck?: string;
  note?: string;
}

interface ListFile {
  property: FoodProperty;
  source: { name: string; url: string; file: string };
  termsNotice?: string | null;
  entries: Entry[];
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const file = process.argv[2];
  const apply = process.argv.includes("--apply");
  const sourceName = arg("--source");
  if (!file || !sourceName) throw new Error('Usage: import-list-checks.ts <file.json> --source "<name>" [--notes ...] [--apply]');

  const data = JSON.parse(readFileSync(file, "utf8")) as ListFile;
  const property = data.property;
  if (!FOOD_PROPERTIES.includes(property)) throw new Error(`Unknown property ${property}`);
  console.log(`${apply ? "APPLYING" : "DRY RUN"}: ${file} → "${sourceName}" (${property}, permission pending)\n`);

  let [source] = await db
    .select({ id: trustedSources.id, useAs: trustedSources.useAs, trustedFor: trustedSources.trustedFor })
    .from(trustedSources)
    .where(eq(trustedSources.name, sourceName))
    .limit(1);
  const notes = arg("--notes");
  if (!source) {
    console.log(`+ source "${sourceName}" (permission pending)`);
    if (apply) {
      [source] = await db
        .insert(trustedSources)
        .values({
          name: sourceName,
          url: data.source.url,
          trustedFor: [property],
          useAs: "check",
          notes: notes ?? "Permission pending. Admin check only; never shown to users.",
          createdBy: CREATED_BY,
        })
        .returning({ id: trustedSources.id, useAs: trustedSources.useAs, trustedFor: trustedSources.trustedFor });
    }
  } else {
    const trustedFor = source.trustedFor.includes(property) ? source.trustedFor : [...source.trustedFor, property];
    if (source.useAs !== "check") console.log(`~ source "${sourceName}": ${source.useAs} → permission pending`);
    if (apply) {
      await db
        .update(trustedSources)
        .set({ useAs: "check", trustedFor, ...(notes ? { notes } : {}), updatedAt: new Date() })
        .where(eq(trustedSources.id, source.id));
    }
  }

  const catalog = await db
    .select({ id: foods.id, name: foods.displayName })
    .from(foods)
    .where(eq(foods.source, "curated"));
  const byName = new Map<string, string[]>();
  for (const f of catalog) byName.set(f.name, [...(byName.get(f.name) ?? []), f.id]);

  let added = 0;
  let dupes = 0;
  const skipped: string[] = [];
  for (const e of data.entries) {
    if (!e.food || !e.level || !LEVELS.includes(e.level)) {
      skipped.push(`${e.listName} (${!e.food ? "no catalog match" : "no clear level"})`);
      continue;
    }
    const ids = byName.get(e.food) ?? [];
    if (ids.length !== 1) {
      skipped.push(`${e.listName} → "${e.food}" (${ids.length} catalog matches)`);
      continue;
    }
    const foodId = ids[0];
    const sample = `${e.listName} — listed as "${e.listCategory}"${e.note ? ` (${e.note})` : ""}`.slice(0, 1000);
    const where = [data.source.file || e.deck, e.page ? `p. ${e.page}` : null].filter(Boolean).join(", ");
    const citation = `${sourceName}${where ? `, ${where}` : ""}`;

    if (source) {
      const [dup] = await db
        .select({ id: foodMeasurements.id })
        .from(foodMeasurements)
        .where(
          and(
            eq(foodMeasurements.foodId, foodId),
            eq(foodMeasurements.property, property),
            eq(foodMeasurements.sourceId, source.id),
            eq(foodMeasurements.citation, citation),
            eq(foodMeasurements.sampleDescription, sample)
          )
        )
        .limit(1);
      if (dup) {
        dupes++;
        continue;
      }
    }
    added++;
    console.log(`  ${e.food.padEnd(24)} ${e.level.padEnd(9)} ← ${e.listName} [${e.listCategory}]`);
    if (apply && source) {
      await db.insert(foodMeasurements).values({
        foodId,
        property,
        valuePer100g: null,
        unit: "level",
        reportedLevel: e.level,
        sampleDescription: sample,
        sourceId: source.id,
        citation,
        citationUrl: null,
        studyYear: null,
        createdBy: CREATED_BY,
      });
    }
  }

  // No re-rating needed: permission-pending rows never change a rating.
  console.log(`\n${apply ? "Added" : "Would add"} ${added}; ${dupes} already stored; ${skipped.length} skipped.`);
  if (skipped.length) console.log(`Skipped: ${skipped.join("; ")}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
