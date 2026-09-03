import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Shared frame for public legal pages (/terms, /privacy).
 * Server-rendered, no auth, readable typography.
 */
export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-[var(--color-surface)]">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-teal-800 hover:text-teal-900 transition-colors"
        >
          Pico Health
        </Link>

        <h1 className="mt-8 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-text-primary)]">
          {title}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">Last updated: {updated}</p>

        <div className="legal-body mt-8 flex flex-col gap-4 text-[15px] leading-relaxed text-[var(--color-text-secondary)] [&_h2]:mt-6 [&_h2]:font-[family-name:var(--font-display)] [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-[var(--color-text-primary)] [&_h3]:mt-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-[var(--color-text-primary)] [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5 [&_a]:text-teal-700 [&_a]:underline [&_a]:decoration-teal-300 [&_a]:underline-offset-2 [&_strong]:text-[var(--color-text-primary)]">
          {children}
        </div>

        <div className="mt-12 flex gap-4 border-t border-[var(--color-border-light)] pt-6 text-sm">
          <Link href="/terms" className="text-teal-700 hover:text-teal-800">Terms of Service</Link>
          <Link href="/privacy" className="text-teal-700 hover:text-teal-800">Privacy Policy</Link>
          <Link href="/login" className="text-[var(--color-text-muted)] hover:text-teal-700">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
