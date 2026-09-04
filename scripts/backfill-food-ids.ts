/**
 * Link a user's food entries to the curated food catalog by name.
 *
 * Insights correlate at the food-PROPERTY level, and properties hang off
 * `timeline_entries.food_id`. Entries created without a link (older seeds,
 * some imports) can only ever correlate by name. This matches each unlinked
 * food entry to a catalog food — exact name first, then trigram similarity —
 * and clears the user's day composites so Insights recomputes with properties.
 *
 *   npx tsx scripts/backfill-food-ids.ts --email demo@picohealth.app --dry-run
 *   npx tsx scripts/backfill-food-ids.ts --email demo@picohealth.app
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

import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { dayComposites, foods, profiles, timelineEntries } from "@/lib/db/schema";

const SIMILARITY = 0.5;

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg("--email");
  const dryRun = process.argv.includes("--dry-run");
  if (!email) throw new Error("--email is required");

  const [user] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.email, email)).limit(1);
  if (!user) throw new Error(`No profile for ${email}`);

  const unlinked = await db
    .select({ name: timelineEntries.name, n: sql<number>`count(*)`.mapWith(Number) })
    .from(timelineEntries)
    .where(and(eq(timelineEntries.userId, user.id), eq(timelineEntries.entryType, "food"), isNull(timelineEntries.foodId)))
    .groupBy(timelineEntries.name)
    .orderBy(sql`count(*) desc`);

  console.log(`${email}: ${unlinked.length} distinct unlinked food names (${unlinked.reduce((s, r) => s + r.n, 0)} entries)`);

  let linked = 0;
  const misses: string[] = [];
  for (const row of unlinked) {
    const [exact] = await db
      .select({ id: foods.id, displayName: foods.displayName })
      .from(foods)
      .where(sql`LOWER(${foods.displayName}) = LOWER(${row.name})`)
      .limit(1);
    let match = exact ?? null;
    if (!match) {
      const [fuzzy] = await db
        .select({ id: foods.id, displayName: foods.displayName })
        .from(foods)
        .where(sql`similarity(${foods.displayName}, ${row.name}) > ${SIMILARITY}`)
        .orderBy(sql`similarity(${foods.displayName}, ${row.name}) DESC`)
        .limit(1);
      match = fuzzy ?? null;
    }
    if (!match) {
      misses.push(`${row.name} (${row.n})`);
      continue;
    }
    console.log(`  ${row.name.padEnd(28)} → ${match.displayName.padEnd(28)} ${row.n} entries${match === exact ? "" : "  (fuzzy)"}`);
    if (!dryRun) {
      await db
        .update(timelineEntries)
        .set({ foodId: match.id })
        .where(and(eq(timelineEntries.userId, user.id), eq(timelineEntries.entryType, "food"), isNull(timelineEntries.foodId), eq(timelineEntries.name, row.name)));
    }
    linked += row.n;
  }

  if (misses.length) console.log(`  no match: ${misses.join(", ")}`);

  if (!dryRun && linked > 0) {
    // Composites cached the property-less view; drop them so Insights recomputes.
    const deleted = await db.delete(dayComposites).where(eq(dayComposites.userId, user.id)).returning({ id: dayComposites.id });
    console.log(`Linked ${linked} entries; cleared ${deleted.length} day composites for recompute.`);
  } else {
    console.log(dryRun ? `Dry run — would link ${linked} entries.` : "Nothing to link.");
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
