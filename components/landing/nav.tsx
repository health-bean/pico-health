import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { LANDING_SITE } from "@/lib/landing-content";

export function Nav() {
  return (
    <nav
      className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-4 md:px-12"
      aria-label="Main navigation"
    >
      <a href="#" className="inline-flex items-center py-2 text-white">
        <Wordmark tone="mono" title={LANDING_SITE.name} className="h-6 w-auto" />
      </a>
      <Link
        href="/login"
        className="rounded-[0.625rem] px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
      >
        Log in
      </Link>
    </nav>
  );
}
