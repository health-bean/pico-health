import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  foodCategories,
  foodSubcategories,
  foodTriggerProperties,
  foods,
  profiles,
  protocols,
  userProtocolState,
} from "@/lib/db/schema";
import { checkComplianceSync, loadProtocolContext, type FoodProperties } from "@/lib/protocols/compliance";
import { fitLine, shortDietName, type PersonalRating } from "@/lib/protocols/fit-line";
import { loadPersonalRatings } from "./ratings";

export type ListGroup = "avoid" | "limit" | "allowed" | "unknown";

export interface ListItem {
  foodId: string;
  name: string;
  category: string;
  /** Why it's in this group, e.g. "nightshade" or "passed reintroduction". */
  reason: string;
  personal: PersonalRating | null;
}

export interface MyList {
  diet: string | null;
  groups: Record<ListGroup, ListItem[]>;
}

const TONE_TO_GROUP = { allowed: "allowed", limit: "limit", avoid: "avoid", unknown: "unknown" } as const;

/**
 * Sort foods into the person's lists: their own rating first, then their
 * diet's rule. Pure, so it can be tested without a database.
 */
export function groupFoods(
  items: { foodId: string; name: string; category: string; status: string | null; reasons: string[] }[],
  diet: string | null,
  personal: Map<string, PersonalRating>
): MyList["groups"] {
  const groups: MyList["groups"] = { avoid: [], limit: [], allowed: [], unknown: [] };
  for (const it of items) {
    const mine = personal.get(it.foodId) ?? null;
    const line = fitLine({ diet, status: it.status ?? "unknown", reasons: it.reasons, personal: mine });
    if (!line) continue; // no diet and no rating: nothing to list
    const reason = mine
      ? line.text.includes(" · ")
        ? line.text.split(" · ")[1]
        : "your rating"
      : line.reasons.join(", ");
    groups[TONE_TO_GROUP[line.tone]].push({ foodId: it.foodId, name: it.name, category: it.category, reason, personal: mine });
  }
  for (const g of Object.values(groups)) g.sort((a, b) => a.name.localeCompare(b.name));
  return groups;
}

export async function buildMyList(userId: string): Promise<MyList> {
  const [user] = await db
    .select({
      protocolId: profiles.currentProtocolId,
      protocolName: protocols.name,
      phaseId: userProtocolState.currentPhaseId,
    })
    .from(profiles)
    .leftJoin(protocols, eq(protocols.id, profiles.currentProtocolId))
    .leftJoin(
      userProtocolState,
      and(eq(userProtocolState.userId, profiles.id), eq(userProtocolState.protocolId, profiles.currentProtocolId))
    )
    .where(eq(profiles.id, userId))
    .limit(1);

  const rows = await db
    .select({
      foodId: foods.id,
      name: foods.displayName,
      category: foodCategories.name,
      t: foodTriggerProperties,
    })
    .from(foods)
    .innerJoin(foodSubcategories, eq(foods.subcategoryId, foodSubcategories.id))
    .innerJoin(foodCategories, eq(foodSubcategories.categoryId, foodCategories.id))
    .leftJoin(foodTriggerProperties, eq(foodTriggerProperties.foodId, foods.id))
    .where(eq(foods.source, "curated"));

  const diet = user?.protocolName ? shortDietName(user.protocolName) : null;
  const personal = await loadPersonalRatings(userId);
  const ctx = user?.protocolId
    ? await loadProtocolContext(user.protocolId, user.phaseId ?? null, rows.map((r) => r.foodId))
    : null;

  const items = rows.map((r) => {
    const t = r.t;
    const props: FoodProperties = t
      ? {
          oxalate: t.oxalate,
          histamine: t.histamine,
          lectin: t.lectin,
          nightshade: t.nightshade,
          histamine_liberator: t.histamineLiberator,
          fodmap: t.fodmap,
          salicylate: t.salicylate,
          tyramine: t.tyramine,
        }
      : {};
    const check = ctx ? checkComplianceSync(ctx, props, r.foodId, r.category) : null;
    return {
      foodId: r.foodId,
      name: r.name,
      category: r.category,
      status: check?.status ?? null,
      reasons: check?.violations ?? [],
    };
  });

  return { diet, groups: groupFoods(items, diet, personal) };
}
