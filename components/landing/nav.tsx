import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { LANDING_SITE, LANDING_FORM } from "@/lib/landing-content";

// Cream header: the full-color wordmark sits on the cream it was drawn for.
// The teal hero rises into it with a soft curve (see hero.tsx).
export function Nav() {
  return (
    <header className="bg-surface">
      <nav
        className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-5 md:h-24 md:px-12"
        aria-label="Main navigation"
      >
        <a href="#" className="-mx-1 rounded-md px-1 py-2">
          <Wordmark title={LANDING_SITE.name} className="h-6 w-auto sm:h-8 md:h-10" />
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
            className="inline-flex min-h-11 items-center whitespace-nowrap rounded-[0.625rem] bg-lp-800 px-3.5 text-sm font-semibold text-lp-cream transition-colors hover:bg-lp-900 md:px-4"
          >
            <span className="md:hidden">Early access</span>
            <span className="hidden md:inline">{LANDING_FORM.button}</span>
          </a>
        </div>
      </nav>
    </header>
  );
}
