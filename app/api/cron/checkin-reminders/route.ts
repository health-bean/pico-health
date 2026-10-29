import { NextResponse } from "next/server";
import { log } from "@/lib/logger";
import { isValidTimezone } from "@/lib/api/validation";
import { listDevices, entriesForDay, deleteDeadToken } from "@/lib/db/queries/push";
import { mergeIntoMeal } from "@/lib/db/queries/entries";
import { localClock, dueReminder, reminderMessage } from "@/lib/push/checkin-reminder";
import { pushConfigured, sendPush, type Platform } from "@/lib/push/send";

/**
 * Sends the post-meal check-in as a push notification to people who turned
 * reminders on. Meant to run every 15 minutes; requires CRON_SECRET. Does
 * nothing until APNs or FCM credentials are set (see lib/push/send.ts).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!pushConfigured("ios") && !pushConfigured("android")) {
    return NextResponse.json({ sent: 0, skipped: "no push credentials" });
  }

  try {
    const devices = await listDevices();
    const byUser = new Map<string, typeof devices>();
    for (const d of devices) byUser.set(d.userId, [...(byUser.get(d.userId) ?? []), d]);

    const now = new Date();
    let sent = 0;
    let removed = 0;
    let failed = 0;
    // One person's bad data (unknown timezone, a DB hiccup, a push error)
    // must not stop everyone else's reminders: each user is isolated.
    for (const [userId, phones] of byUser) {
      try {
        const timeZone = phones[0].timezone && isValidTimezone(phones[0].timezone)
          ? phones[0].timezone
          : "UTC";
        const { date, clock } = localClock(now, timeZone);
        const entries = await entriesForDay(userId, date);
        const meal = dueReminder(entries, clock);
        if (!meal) continue;

        const message = reminderMessage(meal);
        let delivered = false;
        for (const phone of phones) {
          const result = await sendPush(phone.platform as Platform, phone.token, message);
          if (result === "sent") delivered = true;
          if (result === "invalid") {
            await deleteDeadToken(phone.token);
            removed += 1;
          }
        }
        // Once per meal, even if only one of several phones took it.
        if (delivered) {
          await mergeIntoMeal(userId, date, meal.time, { checkinPushedAt: now.toISOString() });
          sent += 1;
        }
      } catch (error) {
        failed += 1;
        log.error("check-in reminder failed for user", { userId, error: error as Error });
      }
    }

    if (sent > 0 || removed > 0 || failed > 0) log.info("check-in reminders", { sent, removed, failed });
    return NextResponse.json(failed > 0 ? { sent, removed, failed } : { sent, removed });
  } catch (error) {
    log.error("check-in reminder cron failed", { error: error as Error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
