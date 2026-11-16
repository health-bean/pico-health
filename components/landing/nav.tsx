import { Wordmark } from "@/components/brand/wordmark";
import { LANDING_SITE, LANDING_FORM } from "@/lib/landing-content";

// Cream header: the full-color wordmark sits on the cream it was drawn for.
// The teal hero rises into it with a soft curve (see hero.tsx). While Pico
// is invite-only, Log in lives in the footer so new visitors see one action.
export function Nav() {
  return (
    <header className="bg-surface">
      <nav
        className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-5 md:h-24 md:px-12"
        aria-label="Main navigation"
      >
        <a href="#" className="-mx-1 rounded-md px-1 py-2">
          <Wordmark title={LANDING_SITE.name} className="h-5 w-auto sm:h-7 md:h-8" />
        </a>
        <div className="flex items-center">
          <a
            href="#early-access"
            className="inline-flex min-h-11 items-center whitespace-nowrap rounded-[0.625rem] bg-clay-500 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-clay-600 md:px-4"
          >
            <span className="md:hidden">Early access</span>
            <span className="hidden md:inline">{LANDING_FORM.button}</span>
          </a>
        </div>
      </nav>
    </header>
  );
}
