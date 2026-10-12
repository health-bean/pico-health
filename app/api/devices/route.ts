import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookies } from "@/lib/auth/session";
import { upsertDeviceToken, deleteDeviceToken } from "@/lib/db/queries/push";
import { log } from "@/lib/logger";

const deviceSchema = z
  .object({
    token: z.string().min(16).max(4096),
    platform: z.enum(["ios", "android"]),
  })
  .strict();

const removeSchema = z.object({ token: z.string().min(16).max(4096) }).strict();

// ── POST /api/devices ── turn check-in reminders on for this phone ──
export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const parsed = deviceSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }
    await upsertDeviceToken(session.userId, parsed.data.token, parsed.data.platform);
    return NextResponse.json({ ok: true });
  } catch (error) {
    log.error("POST /api/devices failed", { error: error as Error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── DELETE /api/devices ── turn them off ──
export async function DELETE(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const parsed = removeSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }
    await deleteDeviceToken(session.userId, parsed.data.token);
    return NextResponse.json({ ok: true });
  } catch (error) {
    log.error("DELETE /api/devices failed", { error: error as Error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
