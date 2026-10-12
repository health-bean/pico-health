"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { cn } from "@/lib/utils";
import { pushAvailable, reminderState, turnRemindersOn, turnRemindersOff, type ReminderState } from "@/lib/native/push";

/**
 * The opt-in for post-meal check-in reminders. Only in the phone app: the
 * web has no way to deliver them.
 */
export function CheckinReminders() {
  // Renders nothing until the state loads, so server and first client
  // render agree even though only the client can tell it is in the app.
  const [native] = useState(() => typeof window !== "undefined" && pushAvailable());
  const [state, setState] = useState<ReminderState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (native) void reminderState().then(setState);
  }, [native]);

  if (!native || state === null) return null;

  const on = state === "on";
  const toggle = async () => {
    setBusy(true);
    try {
      if (on) {
        await turnRemindersOff();
        setState("off");
      } else {
        setState(await turnRemindersOn());
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card header="Reminders" className="mb-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-warm-900" id="checkin-reminders-label">
            Check in after meals
          </p>
          <p className="text-xs text-warm-500">
            A notification about two hours after a meal you logged, asking how you are. Never before 8am or after 9:30pm.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby="checkin-reminders-label"
          disabled={busy || state === "denied"}
          onClick={() => void toggle()}
          className={cn(
            "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 disabled:opacity-50",
            on ? "bg-teal-600" : "bg-warm-300"
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
              on ? "translate-x-6" : "translate-x-1"
            )}
          />
        </button>
      </div>
      {state === "denied" && (
        <p className="mt-2 text-sm text-warm-600">
          Notifications are off for Pico Health. Turn them on in your phone&rsquo;s Settings, then come back here.
        </p>
      )}
    </Card>
  );
}
