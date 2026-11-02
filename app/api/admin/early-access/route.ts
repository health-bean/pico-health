import { NextResponse } from "next/server";
import { z } from "zod";
import { desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles, waitlistSignups } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/require-admin";
import { log } from "@/lib/logger";
import { INVALID_JSON, invalidJsonResponse, readJson, validationErrorResponse } from "@/lib/api/validation";

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(254),
});

// GET /api/admin/early-access - the early-access list, newest first, with
// whether each person is invited and whether they've made an account yet.
export async function GET() {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const people = await db
      .select({
        id: waitlistSignups.id,
        email: waitlistSignups.email,
        ref: waitlistSignups.ref,
        createdAt: waitlistSignups.createdAt,
        invitedAt: waitlistSignups.invitedAt,
        hasAccount: sql<boolean>`exists (select 1 from ${profiles} where lower(${profiles.email}) = ${waitlistSignups.email})`,
      })
      .from(waitlistSignups)
      .orderBy(desc(waitlistSignups.createdAt));

    return NextResponse.json({ people });
  } catch (error) {
    log.error("GET /api/admin/early-access error", { error: error as Error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/admin/early-access - invite an email so it can create an account.
// Adds it to the list if it isn't there; inviting twice keeps the first date.
export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await readJson(request);
    if (body === INVALID_JSON) return invalidJsonResponse();
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error);

    const now = new Date();
    const [person] = await db
      .insert(waitlistSignups)
      .values({ email: parsed.data.email, ref: "admin-invite", invitedAt: now })
      .onConflictDoUpdate({
        target: waitlistSignups.email,
        set: { invitedAt: sql`coalesce(${waitlistSignups.invitedAt}, ${now})` },
      })
      .returning();

    log.info("early-access invite", { by: auth.session.userId });
    return NextResponse.json({ person });
  } catch (error) {
    log.error("POST /api/admin/early-access error", { error: error as Error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
