import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSessionFromCookies } from "@/lib/auth/session";
import { log } from "@/lib/logger";

const trackingGoalDaysSchema = z
  .union([z.number().int().min(7).max(365), z.null()])
  .optional();

/** Today's date (YYYY-MM-DD) in the given IANA timezone, UTC fallback. */
function todayInTimezone(timezone: string | null | undefined): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone || "UTC",
    }).format(new Date());
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const [profile] = await db
      .select({
        id: profiles.id,
        email: profiles.email,
        firstName: profiles.firstName,
        isAdmin: profiles.isAdmin,
        currentProtocolId: profiles.currentProtocolId,
        onboardingCompleted: profiles.onboardingCompleted,
        healthGoals: profiles.healthGoals,
        timezone: profiles.timezone,
        trackingGoalDays: profiles.trackingGoalDays,
        trackingGoalStartDate: profiles.trackingGoalStartDate,
      })
      .from(profiles)
      .where(eq(profiles.id, session.userId))
      .limit(1);

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: profile });
  } catch (error) {
    log.error("GET /api/users/me failed", { error: error as Error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { firstName, currentProtocolId, healthGoals, timezone } = body;

    const goal = trackingGoalDaysSchema.safeParse(body?.trackingGoalDays);
    if (!goal.success) {
      return NextResponse.json(
        {
          error:
            "trackingGoalDays must be an integer between 7 and 365, or null",
        },
        { status: 400 }
      );
    }

    // Setting a goal also stamps its start date (today in the user's
    // timezone); clearing the goal clears both.
    let goalFields:
      | { trackingGoalDays: number | null; trackingGoalStartDate: string | null }
      | undefined;
    if (goal.data !== undefined) {
      if (goal.data === null) {
        goalFields = { trackingGoalDays: null, trackingGoalStartDate: null };
      } else {
        const [profile] = await db
          .select({ timezone: profiles.timezone })
          .from(profiles)
          .where(eq(profiles.id, session.userId))
          .limit(1);

        goalFields = {
          trackingGoalDays: goal.data,
          trackingGoalStartDate: todayInTimezone(profile?.timezone),
        };
      }
    }

    await db
      .update(profiles)
      .set({
        ...(firstName !== undefined && { firstName }),
        ...(currentProtocolId !== undefined && { currentProtocolId }),
        ...(healthGoals !== undefined && { healthGoals }),
        ...(timezone !== undefined && { timezone }),
        ...(goalFields ?? {}),
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, session.userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("PATCH /api/users/me failed", { error: error as Error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
