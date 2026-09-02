import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { timelineEntries } from "@/lib/db/schema";
import { getSessionFromCookies } from "@/lib/auth/session";
import { insightsCache } from "@/lib/cache/insights";
import { log } from "@/lib/logger";

const entrySchema = z.object({
  entryType: z.enum([
    "food",
    "symptom",
    "supplement",
    "medication",
    "exposure",
    "detox",
  ]),
  name: z.string().min(1).max(255),
  severity: z.number().int().min(1).max(10).optional(),
  structuredContent: z.record(z.unknown()).optional(),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  entryTime: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/)
    .optional(),
  timezone: z.string().max(50).optional(),
  // Food-specific fields (mirrors POST /api/entries)
  foodId: z.string().uuid().optional(),
  portion: z.string().max(100).optional(),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
});

const batchSchema = z.object({
  entries: z.array(entrySchema).min(1).max(50),
});

// ── POST /api/entries/batch ──────────────────────────────────────────
// Insert multiple timeline entries in a single statement

export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = batchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const hasFoodFieldsOnNonFood = parsed.data.entries.some(
      (e) =>
        e.entryType !== "food" && (e.foodId || e.portion || e.mealType)
    );
    if (hasFoodFieldsOnNonFood) {
      return NextResponse.json(
        { error: "Food fields can only be provided for food entries" },
        { status: 400 }
      );
    }

    const rows = parsed.data.entries.map((e) => ({
      userId: session.userId,
      entryType: e.entryType,
      name: e.name,
      severity: e.severity ?? null,
      structuredContent: e.structuredContent ?? null,
      entryDate: e.entryDate,
      entryTime: e.entryTime ?? null,
      timezone: e.timezone ?? session.timezone ?? null,
      foodId: e.entryType === "food" ? e.foodId ?? null : null,
      portion:
        e.entryType === "food" ? e.portion ?? "1 serving" : null,
      mealType: e.entryType === "food" ? e.mealType ?? null : null,
    }));

    const inserted = await db
      .insert(timelineEntries)
      .values(rows)
      .returning();

    insightsCache.invalidatePattern(`^${session.userId}:insights:`);

    return NextResponse.json(
      { entries: inserted, count: inserted.length },
      { status: 201 }
    );
  } catch (error) {
    log.error("POST /api/entries/batch error", { error: error as Error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
