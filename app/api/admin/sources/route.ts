import { NextResponse } from "next/server";
import { asc, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { trustedSources } from "@/lib/db/schema";
import { getSessionFromCookies } from "@/lib/auth/session";
import { log } from "@/lib/logger";
import {
  INVALID_JSON,
  invalidJsonResponse,
  readJson,
  validationErrorResponse,
} from "@/lib/api/validation";
import { createSourceSchema, isDuplicateError } from "@/lib/sources/schema";

async function requireAdmin() {
  const session = await getSessionFromCookies();
  if (!session.userId) return { error: "Unauthorized", status: 401 } as const;
  if (!session.isAdmin) return { error: "Forbidden", status: 403 } as const;
  return { session } as const;
}

// GET /api/admin/sources - all trusted sources, active first
export async function GET() {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const sources = await db
      .select()
      .from(trustedSources)
      .orderBy(desc(trustedSources.isActive), asc(trustedSources.name));

    return NextResponse.json({ sources });
  } catch (error) {
    log.error("GET /api/admin/sources error", { error: error as Error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/admin/sources - add a trusted source
export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await readJson(request);
    if (body === INVALID_JSON) return invalidJsonResponse();
    const parsed = createSourceSchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error);

    try {
      const [source] = await db
        .insert(trustedSources)
        .values({
          ...parsed.data,
          notes: parsed.data.notes ?? null,
          createdBy: auth.session.email || auth.session.userId,
        })
        .returning();
      return NextResponse.json({ source }, { status: 201 });
    } catch (error) {
      if (isDuplicateError(error)) {
        return NextResponse.json(
          { error: "A source with this name already exists" },
          { status: 409 }
        );
      }
      throw error;
    }
  } catch (error) {
    log.error("POST /api/admin/sources error", { error: error as Error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
