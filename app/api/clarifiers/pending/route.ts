import { NextResponse } from "next/server";
import { z } from "zod";
import { log } from "@/lib/logger";
import { getSessionFromCookies } from "@/lib/auth/session";
import { getPendingClarifiers } from "@/lib/clarifiers/service";

// ── GET /api/clarifiers/pending?date=YYYY-MM-DD ─────────────────────────
// Up to three open questions for the day, for Reflect's "fill in the blanks".

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const url = new URL(request.url);
    const parsed = querySchema.safeParse({ date: url.searchParams.get("date") ?? "" });
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const clarifiers = await getPendingClarifiers(session.userId, parsed.data.date, 3);
    return NextResponse.json({ clarifiers });
  } catch (error) {
    log.error("GET /api/clarifiers/pending failed", { error: error as Error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
