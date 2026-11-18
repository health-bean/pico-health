// Fact-check the PDF cards against Pico's own food data and protocol rules (read-only).
import { ilike, inArray, sql as dsql } from "drizzle-orm";
import { db } from "@/lib/db";
import { foods, foodTriggerProperties, foodSubcategories, foodCategories, protocols } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { checkComplianceSync, loadProtocolContext, type FoodProperties } from "@/lib/protocols/compliance";

const NAMES = ["spinach", "almonds", "quinoa", "chicken breast", "chicken (fresh)", "chicken", "zucchini", "olive oil", "salmon (fresh)", "salmon", "avocado", "sauerkraut", "white rice", "cucumber", "asparagus"];

async function main() {
  const rows = await db
    .select({ id: foods.id, name: foods.displayName, cat: foodCategories.name, t: foodTriggerProperties })
    .from(foods)
    .innerJoin(foodSubcategories, eq(foods.subcategoryId, foodSubcategories.id))
    .innerJoin(foodCategories, eq(foodSubcategories.categoryId, foodCategories.id))
    .leftJoin(foodTriggerProperties, eq(foodTriggerProperties.foodId, foods.id))
    .where(dsql`${foods.source} = 'curated' and lower(${foods.displayName}) in ${NAMES}`);
  const protos = await db.select({ id: protocols.id, name: protocols.name }).from(protocols)
    .where(dsql`${protocols.name} ilike 'Low Histamine%' or ${protocols.name} ilike '%AIP%' or ${protocols.name} ilike 'Autoimmune%'`);
  console.log("protocols:", protos.map((p) => p.name).join(" | "));
  for (const p of protos) {
    const ctx = await loadProtocolContext(p.id, null, rows.map((r) => r.id));
    console.log(`\n== ${p.name}`);
    for (const r of rows) {
      const t = r.t;
      const props: FoodProperties = t ? { oxalate: t.oxalate, histamine: t.histamine, lectin: t.lectin, nightshade: t.nightshade, histamine_liberator: t.histamineLiberator, fodmap: t.fodmap, salicylate: t.salicylate, tyramine: t.tyramine } : {};
      const c = checkComplianceSync(ctx, props, r.id, r.cat);
      console.log(`${r.name.padEnd(18)} ${String(c.status).padEnd(10)} ${c.violations.join("; ").padEnd(40)} | histamine ${t?.histamine} releases ${t?.histamineLiberator} oxalate ${t?.oxalate} salicylate ${t?.salicylate}`);
    }
  }
  process.exit(0);
}
main();
