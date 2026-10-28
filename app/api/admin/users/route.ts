import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { getSessionFromCookies } from "@/lib/auth/session";
import { z } from "zod";
import { log } from "@/lib/logger";
import { parseBody, uuidString } from "@/lib/api/validation";

const patchUserSchema = z.object({
  userId: uuidString(),
  isAdmin: z.boolean(),
});

async function requireAdmin() {
  const session = await getSessionFromCookies();
  if (!session.userId) return { error: "Unauthorized", status: 401 };
  if (!session.isAdmin) return { error: "Forbidden", status: 403 };
  return { session };
}

// GET - List all users
export async function GET() {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const allUsers = await db
      .select({
        id: profiles.id,
        email: profiles.email,
        firstName: profiles.firstName,
        isAdmin: profiles.isAdmin,
        onboardingCompleted: profiles.onboardingCompleted,
        createdAt: profiles.createdAt,
      })
      .from(profiles)
      .orderBy(asc(profiles.email));

    return NextResponse.json({ users: allUsers });
  } catch (error) {
    log.error("GET /api/admin/users error", { error: error as Error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - Update user role
export async function PATCH(request: Request) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const parsed = await parseBody(request, patchUserSchema);
    if (parsed.response) return parsed.response;
    const { userId, isAdmin } = parsed.data;

    // Prevent removing your own admin access
    if (userId === auth.session.userId && !isAdmin) {
      return NextResponse.json(
        { error: "You cannot remove your own admin access" },
        { status: 400 }
      );
    }

    await db
      .update(profiles)
      .set({ isAdmin })
      .where(eq(profiles.id, userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("PATCH /api/admin/users error", { error: error as Error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
