import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { deviceTokens, profiles, timelineEntries } from "@/lib/db/schema";
import type { Platform } from "@/lib/push/send";

/** Register (or re-register) a phone. A token moves to whoever signed in on it last. */
export async function upsertDeviceToken(userId: string, token: string, platform: Platform) {
  await db
    .insert(deviceTokens)
    .values({ userId, token, platform })
    .onConflictDoUpdate({
      target: deviceTokens.token,
      set: { userId, platform, lastSeenAt: new Date() },
    });
}

/** Opt a phone out. Only the token's own user can remove it. */
export async function deleteDeviceToken(userId: string, token: string) {
  await db.delete(deviceTokens).where(and(eq(deviceTokens.userId, userId), eq(deviceTokens.token, token)));
}

/** The push service said this token is dead. */
export async function deleteDeadToken(token: string) {
  await db.delete(deviceTokens).where(eq(deviceTokens.token, token));
}

/** Every registered phone, with its owner's time zone. */
export function listDevices() {
  return db
    .select({
      userId: deviceTokens.userId,
      token: deviceTokens.token,
      platform: deviceTokens.platform,
      timezone: profiles.timezone,
    })
    .from(deviceTokens)
    .innerJoin(profiles, eq(profiles.id, deviceTokens.userId));
}

/** One user's entries for one day, as the check-in logic reads them. */
export function entriesForDay(userId: string, entryDate: string) {
  return db
    .select({
      entryType: timelineEntries.entryType,
      name: timelineEntries.name,
      entryTime: timelineEntries.entryTime,
      mealType: timelineEntries.mealType,
      structuredContent: timelineEntries.structuredContent,
    })
    .from(timelineEntries)
    .where(and(eq(timelineEntries.userId, userId), eq(timelineEntries.entryDate, entryDate)));
}
