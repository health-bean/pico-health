import { NextResponse } from "next/server";
import { z } from "zod";
import { log } from "@/lib/logger";
import { getSessionFromCookies } from "@/lib/auth/session";
import { deleteEntry, updateEntry, getFoodForUser } from "@/lib/db/queries/entries";
import { insightsCache } from "@/lib/cache/insights";

type RouteContext = { params: Promise<{ id: string }> };

// ── DELETE /api/entries/[id] ────────────────────────────────────────────
// Hard-deletes a single entry owned by the current user. 404 if not owned.

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const deleted = await deleteEntry(session.userId, id);

    if (!deleted) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    insightsCache.invalidatePattern(`^${session.userId}:insights:`);

    return NextResponse.json({ entry: deleted });
  } catch (error) {
    log.error("DELETE /api/entries/[id] failed", { error: error as Error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── PATCH /api/entries/[id] ─────────────────────────────────────────────
// Minimal edit surface: name, notes, severity, date/time, meal type.

const patchEntrySchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    notes: z.string().max(2000).nullable().optional(),
    severity: z.number().int().min(1).max(10).nullable().optional(),
    entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    entryTime: z
      .string()
      .regex(/^\d{2}:\d{2}(:\d{2})?$/)
      .nullable()
      .optional(),
    mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]).nullable().optional(),
    foodId: z.string().uuid().nullable().optional(),
    // Clarifier fields, stored inside structuredContent (see lib/clarifiers).
    preparation: z
      .array(z.enum(["fresh", "leftover", "fermented", "aged", "cured", "canned", "smoked", "dried", "raw"]))
      .max(4)
      .optional(),
    quantity: z.enum(["less", "usual", "more"]).optional(),
    additions: z.array(z.string().min(1).max(40)).max(6).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = patchEntrySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { id } = await params;

    // When linking to a food, verify it exists (curated, or the user's own
    // custom food) and default the entry name to its canonical display name.
    const patch = { ...parsed.data };
    if (typeof patch.foodId === "string") {
      const food = await getFoodForUser(session.userId, patch.foodId);
      if (!food) {
        return NextResponse.json({ error: "Food not found" }, { status: 400 });
      }
      if (patch.name === undefined) {
        patch.name = food.displayName;
      }
    }

    const updated = await updateEntry(session.userId, id, patch);

    if (!updated) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    insightsCache.invalidatePattern(`^${session.userId}:insights:`);

    return NextResponse.json({ entry: updated });
  } catch (error) {
    log.error("PATCH /api/entries/[id] failed", { error: error as Error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
