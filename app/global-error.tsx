"use client";

import { useEffect } from "react";
import "./globals.css";

/**
 * Last-resort error boundary. It replaces the root layout, so it carries
 * its own html/body and pulls in the design tokens itself; the fonts fall
 * back to the faces declared in --font-display / --font-body.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-dvh bg-[var(--color-surface)] font-[family-name:var(--font-body)] text-[var(--color-text-primary)] antialiased">
        <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 py-12 text-center">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-teal-800">
            Something went wrong
          </h1>
          <p className="max-w-sm text-sm leading-relaxed text-[var(--color-text-secondary)]">
            Your entries are safe. Reload to pick up where you left off, and if this keeps
            happening, tell us at support@picohealth.app.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-2 inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-600 px-5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-700"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
