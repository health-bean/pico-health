import Link from "next/link";
import { LANDING_SITE, LANDING_DISCLAIMER } from "@/lib/landing-content";

export function Footer() {
  return (
    <footer className="bg-lp-900 px-6 py-8 md:px-12">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <span className="font-[family-name:var(--font-display)] text-sm font-bold text-white/70">
          {LANDING_SITE.name}
        </span>
        <p className="text-xs text-white/60">
          &copy; {new Date().getFullYear()} Health Bean LLC ·{" "}
          <Link href="/terms" className="hover:text-white">Terms</Link> ·{" "}
          <Link href="/privacy" className="hover:text-white">Privacy</Link>
        </p>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-white/55">{LANDING_DISCLAIMER}</p>
    </footer>
  );
}
