import { NextResponse } from "next/server";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { foods, timelineEntries } from "@/lib/db/schema";
import { getSessionFromCookies } from "@/lib/auth/session";
import { boundedJsonObject, parseBody, uuidString } from "@/lib/api/validation";
import { clearPersonalRating, listPersonalRatings, PERSONAL_STATUSES, setPersonalRating } from "@/lib/personal/ratings";
import { log } from "@/lib/logger";

// ── PUT /api/foods/personal-rating ── the person's own verdict on a food ──
// { foodId | foodName, status: safe | sensitive | unsafe, source?: self | insight,
//   evidence?, notes?, amountNote? }. foodName is what an insight knows: the
//   name as logged, resolved to the catalog food those logs point at.
// ── DELETE /api/foods/personal-rating ── { foodId } clears it ──

const putSchema = z
  .object({
    foodId: uuidString().optional(),
    foodName: z.string().trim().min(1).max(255).optional(),
    status: z.enum(PERSONAL_STATUSES),
    source: z.enum(["self", "insight"]).default("self"),
    evidence: boundedJsonObject(4 * 1024).optional(),
    notes: z.string().trim().max(500).optional(),
    amountNote: z.string().trim().max(200).optional(),
  })
  .refine((b) => b.foodId || b.foodName, { message: "foodId or foodName is required" });

/** The catalog food a person's logs of this name point at, most often first. */
async function resolveFoodId(userId: string, foodName: string): Promise<string | null> {
  const [logged] = await db
    .select({ foodId: timelineEntries.foodId })
    .from(timelineEntries)
    .innerJoin(foods, eq(foods.id, timelineEntries.foodId))
    .where(
      and(
        eq(timelineEntries.userId, userId),
        isNotNull(timelineEntries.foodId),
        sql`lower(${timelineEntries.name}) = lower(${foodName})`
      )
    )
    .groupBy(timelineEntries.foodId)
    .orderBy(desc(sql`count(*)`))
    .limit(1);
  if (logged?.foodId) return logged.foodId;
  const [byName] = await db
    .select({ id: foods.id })
    .from(foods)
    .where(sql`lower(${foods.displayName}) = lower(${foodName})`)
    .limit(1);
  return byName?.id ?? null;
}

const deleteSchema = z.object({ foodId: uuidString() });

// ── GET /api/foods/personal-rating ── the person's whole list ──
export async function GET() {
  const session = await getSessionFromCookies();
  if (!session.userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  try {
    return NextResponse.json({ ratings: await listPersonalRatings(session.userId) });
  } catch (error) {
    log.error("GET /api/foods/personal-rating failed", { error: error as Error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getSessionFromCookies();
  if (!session.userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const parsed = await parseBody(request, putSchema);
  if (parsed.response) return parsed.response;

  try {
    const foodId =
      parsed.data.foodId ?? (parsed.data.foodName ? await resolveFoodId(session.userId, parsed.data.foodName) : null);
    const [food] = foodId
      ? await db.select({ id: foods.id, name: foods.displayName }).from(foods).where(eq(foods.id, foodId)).limit(1)
      : [];
    if (!food) return NextResponse.json({ error: "Food not found" }, { status: 404 });

    await setPersonalRating({
      userId: session.userId,
      foodId: food.id,
      foodName: food.name,
      status: parsed.data.status,
      source: parsed.data.source,
      evidence: parsed.data.evidence,
      notes: parsed.data.notes ?? null,
      amountNote: parsed.data.amountNote ?? null,
    });
    return NextResponse.json({ ok: true, foodId: food.id, personal: { status: parsed.data.status, source: parsed.data.source } });
  } catch (error) {
    log.error("PUT /api/foods/personal-rating failed", { error: error as Error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getSessionFromCookies();
  if (!session.userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const parsed = await parseBody(request, deleteSchema);
  if (parsed.response) return parsed.response;

  try {
    await clearPersonalRating(session.userId, parsed.data.foodId);
    return NextResponse.json({ ok: true, personal: null });
  } catch (error) {
    log.error("DELETE /api/foods/personal-rating failed", { error: error as Error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
