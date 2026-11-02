import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { trustedSources } from "@/lib/db/schema";
import { getSessionFromCookies } from "@/lib/auth/session";
import { log } from "@/lib/logger";
import {
  INVALID_JSON,
  invalidJsonResponse,
  isUuid,
  readJson,
  validationErrorResponse,
} from "@/lib/api/validation";
import { isDuplicateError, updateSourceSchema } from "@/lib/sources/schema";

// PATCH /api/admin/sources/:id - edit a trusted source (including turning it off).
// There is no DELETE: turning a source off keeps the history of what cited it.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!session.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    if (!isUuid(id)) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    const body = await readJson(request);
    if (body === INVALID_JSON) return invalidJsonResponse();
    const parsed = updateSourceSchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error);

    try {
      const [source] = await db
        .update(trustedSources)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(trustedSources.id, id))
        .returning();
      if (!source) {
        return NextResponse.json({ error: "Source not found" }, { status: 404 });
      }
      return NextResponse.json({ source });
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
    log.error("PATCH /api/admin/sources/[id] error", { error: error as Error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
