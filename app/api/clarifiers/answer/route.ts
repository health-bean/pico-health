import { NextResponse } from "next/server";
import { z } from "zod";
import { log } from "@/lib/logger";
import { getSessionFromCookies } from "@/lib/auth/session";
import { answerClarifier } from "@/lib/clarifiers/service";
import { insightsCache } from "@/lib/cache/insights";

// ── POST /api/clarifiers/answer ─────────────────────────────────────────
// { entryId, dimension, answer: string | string[] | "skipped" }

const bodySchema = z.object({
  entryId: z.string().uuid(),
  dimension: z.enum(["preparation", "quantity", "additions"]),
  answer: z.union([
    z.literal("skipped"),
    z.string().min(1).max(50),
    z.array(z.string().min(1).max(50)).min(1).max(6),
  ]),
});

export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const { entryId, dimension } = parsed.data;
    const answer =
      parsed.data.answer === "skipped"
        ? "skipped"
        : Array.isArray(parsed.data.answer)
          ? parsed.data.answer
          : [parsed.data.answer];

    const result = await answerClarifier(session.userId, entryId, dimension, answer);
    if (!result.ok) {
      return result.reason === "not_found"
        ? NextResponse.json({ error: "Entry not found" }, { status: 404 })
        : NextResponse.json({ error: "Answer not recognised for this question" }, { status: 400 });
    }

    if (answer !== "skipped") {
      insightsCache.invalidatePattern(`^${session.userId}:insights:`);
    }
    return NextResponse.json({ ok: true, structuredContent: result.structuredContent });
  } catch (error) {
    log.error("POST /api/clarifiers/answer failed", { error: error as Error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
