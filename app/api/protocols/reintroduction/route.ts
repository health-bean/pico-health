import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import {
  startReintroductionTrial,
  completeReintroductionTrial,
  getActiveTrials,
  getTrialHistory,
} from "@/lib/protocols/reintroduction";
import { z } from "zod";
import { log } from "@/lib/logger";
import { isUuid, boundedJsonObject, parseBody, uuidString } from "@/lib/api/validation";

const startTrialSchema = z.object({
  protocolId: uuidString(),
  foodName: z.string().trim().min(1).max(255), // reintroduction_log.food_name varchar(255)
  foodId: uuidString().optional(),
});

const completeTrialSchema = z.object({
  trialId: uuidString(),
  status: z.enum(["passed", "failed", "inconclusive"]),
  outcome: z.string().max(2000).optional(),
  symptomsSummary: boundedJsonObject(8 * 1024).optional(),
});

// ── GET /api/protocols/reintroduction?protocolId=uuid ────────────────

export async function GET(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const protocolId = searchParams.get("protocolId");

    if (protocolId) {
      if (!isUuid(protocolId)) {
        return NextResponse.json({ error: "Invalid protocolId" }, { status: 400 });
      }
      const trials = await getTrialHistory(session.userId, protocolId);
      return NextResponse.json({ trials });
    }

    // Default: return active trials across all protocols
    const trials = await getActiveTrials(session.userId);
    return NextResponse.json({ trials });
  } catch (error) {
    log.error("GET /api/protocols/reintroduction error", { error: error as Error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ── POST /api/protocols/reintroduction ───────────────────────────────
// Start a new reintroduction trial

export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = await parseBody(request, startTrialSchema);
    if (parsed.response) return parsed.response;
    const { protocolId, foodName, foodId } = parsed.data;

    const trial = await startReintroductionTrial(
      session.userId,
      protocolId,
      foodName,
      foodId
    );

    return NextResponse.json({ trial }, { status: 201 });
  } catch (error) {
    log.error("POST /api/protocols/reintroduction error", { error: error as Error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ── PATCH /api/protocols/reintroduction ──────────────────────────────
// Complete a reintroduction trial

export async function PATCH(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = await parseBody(request, completeTrialSchema);
    if (parsed.response) return parsed.response;
    const { trialId, status, outcome, symptomsSummary } = parsed.data;

    const trial = await completeReintroductionTrial(
      trialId,
      session.userId,
      status,
      outcome,
      symptomsSummary
    );

    if (!trial) {
      return NextResponse.json(
        { error: "Trial not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ trial });
  } catch (error) {
    log.error("PATCH /api/protocols/reintroduction error", { error: error as Error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
