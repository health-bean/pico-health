import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { waitlistSignups } from "@/lib/db/schema";
import { rateLimit, getClientIp, SIGNUP_RATE_LIMIT } from "@/lib/rate-limit";
import { waitlistSchema } from "@/lib/waitlist";

/**
 * Public early-access signup. Same success response whether the address is new
 * or already on the list, so it can't be used to check who signed up.
 */
export async function POST(request: Request) {
  const rl = await rateLimit(`waitlist:${getClientIp(request)}`, SIGNUP_RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many attempts. Please try again in a few minutes." }, { status: 429 });
  }

  const parsed = waitlistSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  try {
    await db
      .insert(waitlistSignups)
      .values({ email: parsed.data.email, ref: parsed.data.ref })
      .onConflictDoNothing({ target: waitlistSignups.email });
  } catch (err) {
    console.error("[waitlist] insert failed", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
