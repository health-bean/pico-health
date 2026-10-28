import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSessionFromCookies } from "@/lib/auth/session";
import { z } from "zod";
import { log } from "@/lib/logger";
import { parseBody, uuidString } from "@/lib/api/validation";

const completeOnboardingSchema = z.object({
  protocolId: uuidString().nullable().optional(),
  // Sent by the client; sample data is no longer loaded server-side.
  loadSampleData: z.boolean().optional(),
});

// GET /api/onboarding - Get onboarding status
export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const [user] = await db
      .select({
        onboardingCompleted: profiles.onboardingCompleted,
        currentProtocolId: profiles.currentProtocolId,
      })
      .from(profiles)
      .where(eq(profiles.id, session.userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      completed: user.onboardingCompleted || false,
      hasProtocol: !!user.currentProtocolId,
    });
  } catch (error) {
    log.error("GET /api/onboarding error", { error: error as Error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/onboarding - Complete onboarding
export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const parsed = await parseBody(request, completeOnboardingSchema);
    if (parsed.response) return parsed.response;
    const { protocolId } = parsed.data;

    // Update user onboarding status
    await db
      .update(profiles)
      .set({
        onboardingCompleted: true,
        ...(protocolId && { currentProtocolId: protocolId }),
      })
      .where(eq(profiles.id, session.userId));

    return NextResponse.json({
      success: true,
      message: "Onboarding completed",
    });
  } catch (error) {
    log.error("POST /api/onboarding error", { error: error as Error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
