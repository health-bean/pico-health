import Link from "next/link";
import { LANDING_SITE } from "@/lib/landing-content";

function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="16" className="fill-white/15" />
      <path
        d="M44 18c-14 0-24 9-24 22 0 2 .2 3.7.7 5.3C24 36 30 30 40 26c-8 5-13 11-15.4 19.4C25.9 46.5 27.9 47 30 47c13 0 20-11 20-24 0-2-.3-3.7-.8-5H44z"
        className="fill-white"
      />
    </svg>
  );
}

export function Nav() {
  return (
    <nav
      className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-4 md:px-12"
      aria-label="Main navigation"
    >
      <a href="#" className="inline-flex items-center gap-2.5">
        <Logo className="h-9 w-9" />
        <span className="font-[family-name:var(--font-display)] text-lg font-bold text-white">
          {LANDING_SITE.name}
        </span>
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
