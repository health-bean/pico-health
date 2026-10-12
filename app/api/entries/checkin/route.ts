import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookies } from "@/lib/auth/session";
import { markMealCheckin } from "@/lib/db/queries/entries";
import { log } from "@/lib/logger";

const checkinSchema = z
  .object({
    entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    mealTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
    answer: z.enum(["fine", "symptom"]),
  })
  .strict();

// ── POST /api/entries/checkin ───────────────────────────────────────
// The answer to "How are you since lunch?", stored on that meal's entries.
export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const parsed = checkinSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const { entryDate, mealTime, answer } = parsed.data;
    const time = mealTime.length === 5 ? `${mealTime}:00` : mealTime;
    const marked = await markMealCheckin(session.userId, entryDate, time, answer);
    if (marked === 0) {
      return NextResponse.json({ error: "Meal not found" }, { status: 404 });
    }
    return NextResponse.json({ marked });
  } catch (error) {
    log.error("POST /api/entries/checkin failed", { error: error as Error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
