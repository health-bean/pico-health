"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
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

// The cache never changes underneath a mounted tree, so there is nothing to
// subscribe to; useSyncExternalStore is used for its hydration contract.
const subscribeNoop = () => () => {};
const serverSnapshot = () => false;

/**
 * Redirects users who haven't finished onboarding.
 *
 * The check hits /api/onboarding once per browser session and caches the
 * result, so tab switches don't flash a full-screen loader. The cache is
 * read through useSyncExternalStore so the server (no sessionStorage) and
 * the client agree during hydration; reading it in a useState initializer
 * rendered the loader on the server and the app on the client, which threw
 * a hydration mismatch on every load after the first.
 */
export function OnboardingCheck({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isOnboardingRoute = pathname === "/onboarding";
  const cached = useSyncExternalStore(subscribeNoop, readCached, serverSnapshot);
  const [verified, setVerified] = useState(false);
  const [checkFailed, setCheckFailed] = useState(false);

  const isOnboarded = isOnboardingRoute || cached || verified || checkFailed;

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
    if (readCached()) return;

    let cancelled = false;
    fetch("/api/onboarding")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.completed) {
          router.push("/onboarding");
        } else {
          writeCached();
          setVerified(true);
        }
      })
      .catch(() => {
        // On error, allow access (fail open)
        if (!cancelled) setCheckFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [isOnboardingRoute, router]);

  if (!isOnboarded) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--color-surface)]">
        <div className="text-center">
          <Spinner />
          <p className="text-sm text-[var(--color-text-muted)] mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
