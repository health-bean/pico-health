"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Spinner } from "@/components/ui";

const SESSION_KEY = "pico:onboarded";

function readCached(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function writeCached() {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // sessionStorage unavailable (private mode, native webview quirks) — fall back to per-load check
  }
}

/**
 * Redirects users who haven't finished onboarding.
 *
 * The check hits /api/onboarding once per browser session and caches the
 * result, so tab switches don't flash a full-screen loader.
 */
export function OnboardingCheck({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isOnboardingRoute = pathname === "/onboarding";
  const [isOnboarded, setIsOnboarded] = useState<boolean>(() => isOnboardingRoute || readCached());
  const [isChecking, setIsChecking] = useState<boolean>(() => !(isOnboardingRoute || readCached()));

  useEffect(() => {
    if (isOnboardingRoute) {
      // Leaving onboarding after completing it should re-check once.
      try {
        sessionStorage.removeItem(SESSION_KEY);
      } catch {
        // ignore
      }
      return;
    }
    if (readCached()) {
      setIsOnboarded(true);
      setIsChecking(false);
      return;
    }

    let cancelled = false;
    fetch("/api/onboarding")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.completed) {
          router.push("/onboarding");
        } else {
          writeCached();
          setIsOnboarded(true);
        }
      })
      .catch(() => {
        // On error, allow access (fail open)
        if (!cancelled) setIsOnboarded(true);
      })
      .finally(() => {
        if (!cancelled) setIsChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOnboardingRoute, router]);

  if (isChecking) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--color-surface)]">
        <div className="text-center">
          <Spinner />
          <p className="text-sm text-[var(--color-text-muted)] mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isOnboarded) {
    return null;
  }

  return <>{children}</>;
}
