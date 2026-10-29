import { NextResponse } from "next/server";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  reintroductionLog,
  reintroductionEntries,
  timelineEntries,
} from "@/lib/db/schema";
import { getSessionFromCookies } from "@/lib/auth/session";
import { z } from "zod";
import { log } from "@/lib/logger";
import { isUuid, readJson } from "@/lib/api/validation";

// ── Validation ─────────────────────────────────────────────────────────

const VALID_ACTIONS = ["stop", "mark_failed", "mark_passed", "extend"] as const;

const patchReintroductionSchema = z.object({
  action: z.enum(VALID_ACTIONS, {
    message: `Invalid action. Must be one of: ${VALID_ACTIONS.join(", ")}`,
  }),
  reason: z.string().max(1000).optional(),
});

function notFound() {
  return NextResponse.json({ error: "Reintroduction not found" }, { status: 404 });
}

// ── GET /api/reintroductions/[id] ──────────────────────────────────────
// Get single reintroduction with details

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id: reintroductionId } = await params;
    if (!isUuid(reintroductionId)) return notFound();

    // Fetch reintroduction record
    const [reintroduction] = await db
      .select()
      .from(reintroductionLog)
      .where(
        and(
          eq(reintroductionLog.id, reintroductionId),
          eq(reintroductionLog.userId, session.userId)
        )
      )
      .limit(1);

    if (!reintroduction) {
      return NextResponse.json(
        { error: "Reintroduction not found" },
        { status: 404 }
      );
    }

    // Fetch associated timeline entries via reintroduction_entries junction
    const linkedEntries = await db
      .select({
        entry: timelineEntries,
        phase: reintroductionEntries.entryPhase,
      })
      .from(reintroductionEntries)
      .innerJoin(
        timelineEntries,
        eq(reintroductionEntries.timelineEntryId, timelineEntries.id)
      )
      .where(eq(reintroductionEntries.reintroductionId, reintroductionId))
      .orderBy(timelineEntries.entryDate, timelineEntries.entryTime);

    // Calculate test period end date (start_date + 7 days)
    const startDate = new Date(reintroduction.startDate);
    const testEndDate = new Date(startDate);
    testEndDate.setDate(testEndDate.getDate() + 7);

    // Fetch symptoms during test period (start_date to start_date + 7 days)
    const symptoms = await db
      .select()
      .from(timelineEntries)
      .where(
        and(
          eq(timelineEntries.userId, session.userId),
          eq(timelineEntries.entryType, "symptom"),
          gte(timelineEntries.entryDate, reintroduction.startDate),
          lte(
            timelineEntries.entryDate,
            testEndDate.toISOString().split("T")[0]
          )
        )
      )
      .orderBy(timelineEntries.entryDate, timelineEntries.entryTime);

    // Calculate analysis data
    const analysis = {
      totalEntries: linkedEntries.length,
      testingPhaseEntries: linkedEntries.filter((e) => e.phase === "testing")
        .length,
      observationPhaseEntries: linkedEntries.filter(
        (e) => e.phase === "observation"
      ).length,
      totalSymptoms: symptoms.length,
      symptomsByType: symptoms.reduce(
        (acc, symptom) => {
          acc[symptom.name] = (acc[symptom.name] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    };

    // If analysis has been completed, include baseline comparison
    let baselineComparison = null;
    if (reintroduction.analysisDate) {
      // Fetch baseline symptoms (7 days before start)
      const baselineStart = new Date(startDate);
      baselineStart.setDate(baselineStart.getDate() - 7);

      const baselineSymptoms = await db
        .select()
        .from(timelineEntries)
        .where(
          and(
            eq(timelineEntries.userId, session.userId),
            eq(timelineEntries.entryType, "symptom"),
            gte(
              timelineEntries.entryDate,
              baselineStart.toISOString().split("T")[0]
            ),
            lte(
              timelineEntries.entryDate,
              sql`${reintroduction.startDate}::date - interval '1 day'`
            )
          )
        );

      const baselineByType = baselineSymptoms.reduce(
        (acc, symptom) => {
          acc[symptom.name] = (acc[symptom.name] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      baselineComparison = {
        baselineSymptomCount: baselineSymptoms.length,
        testSymptomCount: symptoms.length,
        symptomFrequencyBefore: baselineSymptoms.length / 7,
        symptomFrequencyDuring: symptoms.length / 7,
        symptomsByType: baselineByType,
      };
    }

    return NextResponse.json({
      reintroduction,
      entries: linkedEntries.map((e) => ({
        ...e.entry,
        phase: e.phase,
      })),
      symptoms,
      analysis: {
        ...analysis,
        ...(baselineComparison && { baseline: baselineComparison }),
      },
    });
  } catch (error) {
    log.error("GET /api/reintroductions/[id] error", { error: error as Error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ── PATCH /api/reintroductions/[id] ────────────────────────────────────
// Update reintroduction status with actions: stop, mark_failed, mark_passed, extend

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id: reintroductionId } = await params;
    if (!isUuid(reintroductionId)) return notFound();

    const body = await readJson(request);
    const parsed = patchReintroductionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Validation failed" },
        { status: 400 }
      );
    }
    const { action, reason } = parsed.data;

    // Fetch reintroduction record
    const [reintroduction] = await db
      .select()
      .from(reintroductionLog)
      .where(
        and(
          eq(reintroductionLog.id, reintroductionId),
          eq(reintroductionLog.userId, session.userId)
        )
      )
      .limit(1);

    if (!reintroduction) {
      return NextResponse.json(
        { error: "Reintroduction not found" },
        { status: 404 }
      );
    }

    // Prepare update data based on action
    const now = new Date().toISOString().split("T")[0];
    let updateData: Partial<typeof reintroductionLog.$inferInsert> = {};

    switch (action) {
      case "stop":
        // Only allow stopping active reintroductions
        if (reintroduction.status !== "active") {
          return NextResponse.json(
            { error: "Can only stop active reintroductions" },
            { status: 400 }
          );
        }
        updateData = {
          status: "cancelled",
          cancellationDate: now,
          cancellationReason: reason || "User stopped reintroduction",
          endDate: now,
        };
        break;

      case "mark_failed":
        // Only allow marking active reintroductions as failed
        if (reintroduction.status !== "active") {
          return NextResponse.json(
            { error: "Can only mark active reintroductions as failed" },
            { status: 400 }
          );
        }
        updateData = {
          status: "failed",
          endDate: now,
          analysisDate: now,
          analysisNotes:
            reason || "Manually marked as failed due to severe reactions",
          outcome: "Failed - manually marked by user",
        };
        break;

      case "mark_passed":
        // Only allow marking active reintroductions as passed
        if (reintroduction.status !== "active") {
          return NextResponse.json(
            { error: "Can only mark active reintroductions as passed" },
            { status: 400 }
          );
        }
        updateData = {
          status: "passed",
          endDate: now,
          analysisDate: now,
          analysisNotes: reason || "Manually marked as passed by user",
          outcome: "Passed - manually marked by user",
        };
        break;

      case "extend":
        // Allow extending completed or active reintroductions
        if (
          reintroduction.status !== "active" &&
          reintroduction.status !== "inconclusive"
        ) {
          return NextResponse.json(
            {
              error:
                "Can only extend active or inconclusive reintroductions",
            },
            { status: 400 }
          );
        }
        // Extend by 3 days (add to current day or reset to testing phase)
        const newDay = (reintroduction.currentDay || 1) + 3;
        updateData = {
          currentDay: newDay,
          currentPhase: newDay <= 3 ? "testing" : "observation",
          status: "active",
          analysisNotes: `Extended observation period. ${reason || ""}`.trim(),
        };
        break;
    }

    // Update the reintroduction record
    const [updated] = await db
      .update(reintroductionLog)
      .set(updateData)
      .where(eq(reintroductionLog.id, reintroductionId))
      .returning();

    return NextResponse.json({
      success: true,
      reintroduction: updated,
    });
  } catch (error) {
    log.error("PATCH /api/reintroductions/[id] error", { error: error as Error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
