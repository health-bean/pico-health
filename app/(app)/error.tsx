"use client";

import { useEffect } from "react";
import { Button, PageTitle } from "@/components/ui";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <PageTitle as="h2">Something went wrong</PageTitle>
      <p className="max-w-sm text-sm leading-relaxed text-[var(--color-text-secondary)]">
        Your entries are safe. Try again, and if it keeps happening, write to{" "}
        <a href="mailto:support@picohealth.app" className="font-medium text-teal-700 underline-offset-2 hover:underline">
          support@picohealth.app
        </a>
        .
      </p>
      <Button onClick={reset} variant="secondary">
        Try again
      </Button>
    </div>
  );
}
