import { NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { protocols, protocolRules, protocolPhases } from "@/lib/db/schema";
import { getSessionFromCookies } from "@/lib/auth/session";
import { log } from "@/lib/logger";
import { isUuid } from "@/lib/api/validation";

// ── GET /api/protocols/[id] ─────────────────────────────────────────────

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!isUuid(id)) {
      return NextResponse.json({ error: "Protocol not found" }, { status: 404 });
    }

    const [protocol] = await db
      .select({
        id: protocols.id,
        name: protocols.name,
        description: protocols.description,
        category: protocols.category,
        durationWeeks: protocols.durationWeeks,
        hasPhases: protocols.hasPhases,
        isActive: protocols.isActive,
        createdAt: protocols.createdAt,
      })
      .from(protocols)
      .where(eq(protocols.id, id))
      .limit(1);

    if (!protocol) {
      return NextResponse.json(
        { error: "Protocol not found" },
        { status: 404 }
      );
    }

    const rules = await db
      .select({
        id: protocolRules.id,
        phaseId: protocolRules.phaseId,
        ruleType: protocolRules.ruleType,
        propertyName: protocolRules.propertyName,
        propertyValues: protocolRules.propertyValues,
        status: protocolRules.status,
        ruleOrder: protocolRules.ruleOrder,
        notes: protocolRules.notes,
      })
      .from(protocolRules)
      .where(eq(protocolRules.protocolId, id))
      .orderBy(asc(protocolRules.ruleOrder));

    // Include phases if protocol has them
    let phases: unknown[] = [];
    if (protocol.hasPhases) {
      phases = await db
        .select({
          id: protocolPhases.id,
          name: protocolPhases.name,
          slug: protocolPhases.slug,
          phaseOrder: protocolPhases.phaseOrder,
          durationWeeks: protocolPhases.durationWeeks,
          description: protocolPhases.description,
          guidance: protocolPhases.guidance,
        })
        .from(protocolPhases)
        .where(eq(protocolPhases.protocolId, id))
        .orderBy(asc(protocolPhases.phaseOrder));
    }

    return NextResponse.json({ protocol, rules, phases });
  } catch (error) {
    log.error("GET /api/protocols/[id] error", { error: error as Error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
