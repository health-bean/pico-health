import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { LANDING_SITE, LANDING_DISCLAIMER } from "@/lib/landing-content";

const LINKS = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  // Invite-only for now: existing members log in from here, not the header.
  { href: "/login", label: "Log in" },
] as const;

// Cream footer that bookends the cream header: full-color wordmark, plain
// links, then the disclaimer and the operator line.
export function Footer() {
  return (
    <footer className="border-t border-lp-cream-dark bg-surface px-6 pt-12 pb-10 md:px-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <a href="#" className="-mx-1 self-start rounded-md px-1 py-1">
            <Wordmark title={LANDING_SITE.name} className="h-7 w-auto" />
          </a>
          <nav aria-label="Footer" className="-mx-3 flex flex-wrap">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="inline-flex min-h-11 items-center rounded-[0.625rem] px-3 text-sm font-semibold text-lp-800 transition-colors hover:bg-lp-accent-bg"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-8 border-t border-lp-cream-dark pt-6 text-xs leading-relaxed text-lp-muted">
          <p className="max-w-prose">{LANDING_DISCLAIMER}</p>
          <p className="mt-2">&copy; {new Date().getFullYear()} Health Bean LLC</p>
        </div>
      </div>
    </footer>
  );
}
