import { NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  protocols,
  protocolPhases,
  userProtocolState,
} from "@/lib/db/schema";
import { getSessionFromCookies } from "@/lib/auth/session";
import { getUserProtocolContext, advancePhase } from "@/lib/protocols";
import { z } from "zod";
import { log } from "@/lib/logger";
import { parseBody, uuidString } from "@/lib/api/validation";

const protocolIdBodySchema = z.object({ protocolId: uuidString() });

// ── GET /api/protocols/state ──────────────────────────────────────────
// Returns user's current protocol state (phase, day number, etc.)

export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all protocol states for this user
    const states = await db
      .select()
      .from(userProtocolState)
      .where(eq(userProtocolState.userId, session.userId));

    if (states.length === 0) {
      return NextResponse.json({ states: [] });
    }

    // Enrich each state with protocol and phase info
    const enriched = await Promise.all(
      states.map(async (state) => {
        const context = await getUserProtocolContext(
          session.userId,
          state.protocolId
        );
        return {
          ...state,
          protocolName: context?.protocolName,
          currentPhase: context?.currentPhase,
        };
      })
    );

    return NextResponse.json({ states: enriched });
  } catch (error) {
    log.error("GET /api/protocols/state error", { error: error as Error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ── POST /api/protocols/state ─────────────────────────────────────────
// Start or set a protocol for the user (creates state with first phase)

export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = await parseBody(request, protocolIdBodySchema);
    if (parsed.response) return parsed.response;
    const { protocolId } = parsed.data;

    // Verify protocol exists
    const [protocol] = await db
      .select()
      .from(protocols)
      .where(eq(protocols.id, protocolId))
      .limit(1);

    if (!protocol) {
      return NextResponse.json(
        { error: "Protocol not found" },
        { status: 404 }
      );
    }

    // Get first phase if protocol has phases
    let firstPhaseId: string | null = null;
    let expectedEnd: string | null = null;
    const today = new Date().toISOString().split("T")[0];

    if (protocol.hasPhases) {
      const [firstPhase] = await db
        .select()
        .from(protocolPhases)
        .where(eq(protocolPhases.protocolId, protocolId))
        .orderBy(asc(protocolPhases.phaseOrder))
        .limit(1);

      if (firstPhase) {
        firstPhaseId = firstPhase.id;
        if (firstPhase.durationWeeks) {
          expectedEnd = new Date(
            Date.now() + firstPhase.durationWeeks * 7 * 24 * 60 * 60 * 1000
          )
            .toISOString()
            .split("T")[0];
        }
      }
    }

    // Upsert user protocol state
    const [state] = await db
      .insert(userProtocolState)
      .values({
        userId: session.userId,
        protocolId,
        currentPhaseId: firstPhaseId,
        phaseStartDate: today,
        expectedEndDate: expectedEnd,
      })
      .onConflictDoUpdate({
        target: [userProtocolState.userId, userProtocolState.protocolId],
        set: {
          currentPhaseId: firstPhaseId,
          phaseStartDate: today,
          expectedEndDate: expectedEnd,
          updatedAt: new Date(),
        },
      })
      .returning();

    return NextResponse.json({ state }, { status: 201 });
  } catch (error) {
    log.error("POST /api/protocols/state error", { error: error as Error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ── PATCH /api/protocols/state ────────────────────────────────────────
// Advance to the next phase

export async function PATCH(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = await parseBody(request, protocolIdBodySchema);
    if (parsed.response) return parsed.response;
    const { protocolId } = parsed.data;

    const nextPhase = await advancePhase(session.userId, protocolId);

    if (!nextPhase) {
      return NextResponse.json(
        { error: "Cannot advance — already on the last phase or no state found" },
        { status: 400 }
      );
    }

    // Get updated context
    const context = await getUserProtocolContext(session.userId, protocolId);

    return NextResponse.json({
      phase: nextPhase,
      context,
    });
  } catch (error) {
    log.error("PATCH /api/protocols/state error", { error: error as Error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
