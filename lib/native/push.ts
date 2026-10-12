"use client";

import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

/**
 * Post-meal check-in reminders on the native app. Web visitors never see
 * any of this. The token is kept on the device so turning reminders off, or
 * signing out, can tell the server to forget this phone.
 */

const TOKEN_KEY = "pico:pushToken";

export const pushAvailable = () => Capacitor.isNativePlatform();

function platform(): "ios" | "android" | null {
  const p = Capacitor.getPlatform();
  return p === "ios" || p === "android" ? p : null;
}

function storedToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Ask the OS for a token and hand it to the server. Resolves once registered. */
function registerWithServer(): Promise<boolean> {
  return new Promise((resolve) => {
    const done = (ok: boolean) => {
      void PushNotifications.removeAllListeners().then(() => listenForTaps());
      resolve(ok);
    };
    void PushNotifications.addListener("registration", async ({ value }) => {
      try {
        localStorage.setItem(TOKEN_KEY, value);
      } catch {
        // the server copy is what matters
      }
      const res = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: value, platform: platform() }),
      }).catch(() => null);
      done(Boolean(res?.ok));
    });
    void PushNotifications.addListener("registrationError", () => done(false));
    void PushNotifications.register();
  });
}

export type ReminderState = "on" | "off" | "denied";

export async function reminderState(): Promise<ReminderState> {
  if (!pushAvailable()) return "off";
  const { receive } = await PushNotifications.checkPermissions();
  if (receive === "denied") return "denied";
  return receive === "granted" && storedToken() ? "on" : "off";
}

export async function turnRemindersOn(): Promise<ReminderState> {
  if (!pushAvailable()) return "off";
  let { receive } = await PushNotifications.checkPermissions();
  if (receive === "prompt" || receive === "prompt-with-rationale") {
    receive = (await PushNotifications.requestPermissions()).receive;
  }
  if (receive !== "granted") return "denied";
  return (await registerWithServer()) ? "on" : "off";
}

/** Turn reminders off, or forget this phone on sign-out. */
export async function turnRemindersOff(): Promise<void> {
  const token = storedToken();
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // nothing stored
  }
  if (token) {
    await fetch("/api/devices", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }).catch(() => null);
  }
  if (pushAvailable()) await PushNotifications.unregister().catch(() => null);
}

/** A tapped reminder opens the page it names (the Log). */
export function listenForTaps(navigate: (url: string) => void = (url) => window.location.assign(url)) {
  if (!pushAvailable()) return;
  void PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
    const url = (notification.data as { url?: string } | undefined)?.url;
    if (url && url.startsWith("/")) navigate(url);
  });
}

/** On launch: keep the token fresh (they rotate) and handle taps. */
export async function refreshOnLaunch(navigate: (url: string) => void) {
  if (!pushAvailable()) return;
  listenForTaps(navigate);
  if ((await reminderState()) === "on") {
    await registerWithServer();
    listenForTaps(navigate);
  }
}
