import { NextResponse } from "next/server";
import { z } from "zod";
import { log } from "@/lib/logger";
import { getSessionFromCookies } from "@/lib/auth/session";
import { getClarifiersForEntries } from "@/lib/clarifiers/service";

// ── GET /api/clarifiers?entryIds=a,b ────────────────────────────────────
// The single clarifier (if any) to show on a just-saved capture card.

const querySchema = z.object({
  entryIds: z
    .string()
    .transform((s) => s.split(",").map((x) => x.trim()).filter(Boolean))
    .pipe(z.array(z.string().uuid()).min(1).max(25)),
});

export async function GET(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const url = new URL(request.url);
    const parsed = querySchema.safeParse({ entryIds: url.searchParams.get("entryIds") ?? "" });
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const clarifiers = await getClarifiersForEntries(session.userId, parsed.data.entryIds);
    return NextResponse.json({ clarifiers });
  } catch (error) {
    log.error("GET /api/clarifiers failed", { error: error as Error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
