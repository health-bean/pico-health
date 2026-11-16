import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import { buildMyList } from "@/lib/personal/my-list";
import { log } from "@/lib/logger";

// ── GET /api/foods/my-list ── the person's diet lists plus their own ratings ──
export async function GET() {
  const session = await getSessionFromCookies();
  if (!session.userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  try {
    return NextResponse.json(await buildMyList(session.userId));
  } catch (error) {
    log.error("GET /api/foods/my-list failed", { error: error as Error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
