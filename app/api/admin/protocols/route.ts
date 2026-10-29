import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { protocols, protocolRules } from "@/lib/db/schema";
import { eq, asc, sql } from "drizzle-orm";
import { getSessionFromCookies } from "@/lib/auth/session";
import { z } from "zod";
import { log } from "@/lib/logger";
import { parseBody, uuidString } from "@/lib/api/validation";

// Column limits: protocols.name varchar(255), category varchar(50);
// protocol_rules.rule_type varchar(50), property_name varchar(50), status varchar(20).
const protocolName = z.string().trim().min(1).max(255);
const protocolDescription = z.string().max(5000).nullable();
const protocolCategory = z.string().max(50).nullable();
const ruleType = z.string().trim().min(1).max(50);
const ruleStatus = z.string().trim().min(1).max(20);
const propertyName = z.string().max(50).nullable();
const propertyValues = z.array(z.string().max(50)).max(50);
const ruleNotes = z.string().max(2000).nullable();

const postSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create_protocol"),
    name: protocolName,
    description: protocolDescription.optional(),
    category: protocolCategory.optional(),
  }),
  z.object({
    action: z.literal("add_rule"),
    protocolId: uuidString(),
    ruleType,
    propertyName: propertyName.optional(),
    propertyValues: propertyValues.optional(),
    status: ruleStatus,
    notes: ruleNotes.optional(),
  }),
]);

const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update_protocol"),
    id: uuidString(),
    name: protocolName.optional(),
    description: protocolDescription.optional(),
    category: protocolCategory.optional(),
  }),
  z.object({
    action: z.literal("update_rule"),
    id: uuidString(),
    ruleType: ruleType.optional(),
    propertyName: propertyName.optional(),
    propertyValues: propertyValues.optional(),
    status: ruleStatus.optional(),
    notes: ruleNotes.optional(),
  }),
]);

const deleteSchema = z.object({
  action: z.enum(["delete_protocol", "delete_rule"]),
  id: uuidString(),
});

async function requireAdmin() {
  const session = await getSessionFromCookies();
  if (!session.userId) return { error: "Unauthorized", status: 401 };
  if (!session.isAdmin) return { error: "Forbidden", status: 403 };
  return { session };
}

// GET - List all protocols with rules
export async function GET() {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const allProtocols = await db
      .select({
        id: protocols.id,
        name: protocols.name,
        description: protocols.description,
        category: protocols.category,
        durationWeeks: protocols.durationWeeks,
        hasPhases: protocols.hasPhases,
        isActive: protocols.isActive,
      })
      .from(protocols)
      .orderBy(asc(protocols.name));

    const result = [];
    for (const protocol of allProtocols) {
      const rules = await db
        .select({
          id: protocolRules.id,
          ruleType: protocolRules.ruleType,
          propertyName: protocolRules.propertyName,
          propertyValues: protocolRules.propertyValues,
          status: protocolRules.status,
          ruleOrder: protocolRules.ruleOrder,
          notes: protocolRules.notes,
        })
        .from(protocolRules)
        .where(eq(protocolRules.protocolId, protocol.id))
        .orderBy(asc(protocolRules.ruleOrder));

      result.push({ ...protocol, rules });
    }

    return NextResponse.json({ protocols: result });
  } catch (error) {
    log.error("GET /api/admin/protocols error", { error: error as Error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create a protocol or add a rule
export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const parsed = await parseBody(request, postSchema);
    if (parsed.response) return parsed.response;
    const body = parsed.data;

    if (body.action === "create_protocol") {
      const { name, description, category } = body;

      const [created] = await db
        .insert(protocols)
        .values({
          name,
          description: description || null,
          category: category || null,
          isActive: true,
        })
        .returning({ id: protocols.id, name: protocols.name });

      return NextResponse.json({ success: true, protocol: created });
    }

    if (body.action === "add_rule") {
      const { protocolId, ruleType, propertyName, propertyValues, status, notes } = body;

      // Get next rule order
      const [maxOrder] = await db
        .select({ max: sql<number>`COALESCE(MAX(${protocolRules.ruleOrder}), 0)` })
        .from(protocolRules)
        .where(eq(protocolRules.protocolId, protocolId));

      const [created] = await db
        .insert(protocolRules)
        .values({
          protocolId,
          ruleType,
          propertyName: propertyName || null,
          propertyValues: propertyValues || [],
          status,
          ruleOrder: (maxOrder?.max ?? 0) + 1,
          notes: notes || null,
        })
        .returning();

      return NextResponse.json({ success: true, rule: created });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    log.error("POST /api/admin/protocols error", { error: error as Error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - Update a protocol or rule
export async function PATCH(request: Request) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const parsed = await parseBody(request, patchSchema);
    if (parsed.response) return parsed.response;
    const body = parsed.data;

    if (body.action === "update_protocol") {
      const { id, name, description, category } = body;

      await db
        .update(protocols)
        .set({
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(category !== undefined && { category }),
        })
        .where(eq(protocols.id, id));

      return NextResponse.json({ success: true });
    }

    if (body.action === "update_rule") {
      const { id, ruleType, propertyName, propertyValues, status, notes } = body;

      await db
        .update(protocolRules)
        .set({
          ...(ruleType !== undefined && { ruleType }),
          ...(propertyName !== undefined && { propertyName }),
          ...(propertyValues !== undefined && { propertyValues }),
          ...(status !== undefined && { status }),
          ...(notes !== undefined && { notes }),
        })
        .where(eq(protocolRules.id, id));

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    log.error("PATCH /api/admin/protocols error", { error: error as Error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Delete a protocol or rule
export async function DELETE(request: Request) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const parsed = await parseBody(request, deleteSchema);
    if (parsed.response) return parsed.response;
    const { action, id } = parsed.data;

    if (action === "delete_protocol") {
      // Delete rules first, then protocol
      await db.delete(protocolRules).where(eq(protocolRules.protocolId, id));
      await db.delete(protocols).where(eq(protocols.id, id));
      return NextResponse.json({ success: true });
    }

    if (action === "delete_rule") {
      await db.delete(protocolRules).where(eq(protocolRules.id, id));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    log.error("DELETE /api/admin/protocols error", { error: error as Error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
