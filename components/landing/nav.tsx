import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { LANDING_SITE, LANDING_FORM } from "@/lib/landing-content";

// Cream header bar: the full-color wordmark sits on the cream it was drawn
// for, and the teal hero starts right under it. Sticky, so the brand stays
// in view down the page.
export function Nav() {
  return (
    <header className="sticky top-0 z-20 border-b border-lp-cream-dark bg-surface shadow-[0_6px_18px_-12px_rgb(31_81_86/0.35)]">
      <nav
        className="mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between gap-4 px-5 md:px-12"
        aria-label="Main navigation"
      >
        <a href="#" className="-mx-1 rounded-md px-1 py-2">
          <Wordmark title={LANDING_SITE.name} className="h-6 w-auto sm:h-7 md:h-9" />
        </a>
        <div className="flex items-center gap-1 md:gap-2">
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center whitespace-nowrap rounded-[0.625rem] px-2.5 text-sm font-semibold text-lp-800 transition-colors hover:bg-lp-accent-bg md:px-4"
          >
            Log in
          </Link>
          <a
            href="#early-access"
            className="inline-flex min-h-11 items-center whitespace-nowrap rounded-[0.625rem] bg-lp-800 px-3.5 md:px-4 text-sm font-semibold text-lp-cream transition-colors hover:bg-lp-900"
          >
            <span className="md:hidden">Early access</span>
            <span className="hidden md:inline">{LANDING_FORM.button}</span>
          </a>
        </div>
      </nav>
    </header>
  );
}
