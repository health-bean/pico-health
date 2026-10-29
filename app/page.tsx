import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Activity, ClipboardCheck, Search, Wind } from "lucide-react";
import { LANDING } from "@/lib/landing-content";
import { normalizeRef } from "@/lib/waitlist";
import { WaitlistForm } from "@/components/landing/waitlist-form";
import { cn } from "@/lib/utils";

// Signed-in visitors never see this page: middleware sends them to /log.

export const metadata: Metadata = {
  title: { absolute: "Pico Health · Find the patterns behind chronic illness" },
  description: LANDING.hero.subtitle,
  openGraph: {
    title: "Pico Health",
    description: LANDING.hero.subtitle,
    url: "https://picohealth.app",
    siteName: "Pico Health",
    type: "website",
  },
};

const ICONS = { activity: Activity, clipboard: ClipboardCheck, search: Search, wind: Wind } as const;

const TONES = {
  clay: "bg-clay-50 text-clay-600",
  brick: "bg-clay-50 text-brick-600",
  olive: "bg-olive-50 text-olive-600",
  gold: "bg-gold-50 text-ochre-700",
  teal: "bg-teal-50 text-teal-700",
} as const;

const AVATARS = { clay: "bg-clay-600", teal: "bg-teal-700" } as const;

function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="16" className="fill-teal-700" />
      <path
        d="M44 18c-14 0-24 9-24 22 0 2 .2 3.7.7 5.3C24 36 30 30 40 26c-8 5-13 11-15.4 19.4C25.9 46.5 27.9 47 30 47c13 0 20-11 20-24 0-2-.3-3.7-.8-5H44z"
        className="fill-warm-50"
      />
    </svg>
  );
}

function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-xs font-bold uppercase tracking-[0.16em] text-clay-600", className)}>{children}</p>
  );
}

const display = "font-[family-name:var(--font-display)]";

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const refCode = normalizeRef((await searchParams).ref) ?? undefined;

  return (
    <main className="min-h-dvh bg-[var(--color-surface)] text-[var(--color-text-primary)]">
      {/* Hero */}
      <section className="bg-teal-900 text-warm-50">
        <div className="mx-auto max-w-5xl px-6 pb-16 pt-6 md:px-10 md:pb-24">
          <nav className="flex items-center justify-between" aria-label="Main">
            <span className={cn(display, "flex items-center gap-2.5 text-xl font-bold")}>
              <Logo className="h-9 w-9" />
              Pico Health
            </span>
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-sm font-semibold text-teal-100 transition hover:bg-teal-800 hover:text-white"
            >
              Log in
            </Link>
          </nav>

          <div className="mt-14 max-w-3xl md:mt-20">
            <span className="inline-block rounded-full bg-gold-400 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-teal-900">
              {LANDING.hero.eyebrow}
            </span>
            <h1 className={cn(display, "mt-5 text-balance text-4xl font-bold leading-[1.08] md:text-6xl")}>
              {LANDING.hero.headline}
            </h1>
            <p className="mt-5 max-w-2xl text-lg font-semibold text-gold-400 md:text-xl">
              {LANDING.hero.subtitle}
            </p>
            <div className="mt-8 max-w-xl">
              <WaitlistForm refCode={refCode} tone="dark" id="hero" />
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="mx-auto max-w-5xl px-6 py-16 md:px-10 md:py-20">
        <div className="grid gap-10 md:grid-cols-[1fr_200px] md:items-start">
          <div>
            <Eyebrow>{LANDING.problem.label}</Eyebrow>
            <h2 className={cn(display, "mt-3 text-balance text-3xl font-bold leading-tight text-teal-900 md:text-4xl")}>
              {LANDING.problem.headline}
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-[var(--color-text-secondary)]">
              {LANDING.problem.body}
            </p>
          </div>
          <div className="rounded-2xl border border-warm-200 bg-[var(--color-surface-card)] p-6 text-center md:mt-10">
            <p className={cn(display, "text-5xl font-bold text-clay-600")}>{LANDING.problem.stat.value}</p>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{LANDING.problem.stat.description}</p>
          </div>
        </div>

        <blockquote
          className={cn(
            display,
            "mt-14 border-l-4 border-gold-400 py-1 pl-6 text-balance text-2xl italic leading-relaxed text-teal-900 md:text-3xl"
          )}
        >
          &ldquo;{LANDING.quote}&rdquo;
        </blockquote>
      </section>

      {/* Product */}
      <section className="mx-auto max-w-5xl px-6 pb-16 md:px-10 md:pb-20">
        <Eyebrow>{LANDING.product.label}</Eyebrow>
        <h2 className={cn(display, "mt-3 text-3xl font-bold leading-tight text-teal-900")}>
          {LANDING.product.headline}
        </h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {LANDING.product.features.map((f) => {
            const Icon = ICONS[f.icon];
            return (
              <li
                key={f.text}
                className="flex items-center gap-4 rounded-2xl border border-warm-200 bg-[var(--color-surface-card)] p-5 font-semibold text-teal-900"
              >
                <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", TONES[f.tone])}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                {f.text}
              </li>
            );
          })}
        </ul>
      </section>

      {/* See it in action */}
      <section className="bg-warm-100/60 py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-6 md:px-10">
          <Eyebrow>{LANDING.showcase.label}</Eyebrow>
          <h2 className={cn(display, "mt-3 text-3xl font-bold leading-tight text-teal-900 md:text-4xl")}>
            {LANDING.showcase.headline}
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3 md:items-start">
            {LANDING.showcase.cards.map((card) => (
              <figure key={card.src}>
                <Image
                  src={card.src}
                  alt={card.alt}
                  width={720}
                  height={1047}
                  sizes="(min-width: 768px) 300px, 90vw"
                  className="w-full rounded-2xl"
                />
                {card.caption && (
                  <figcaption className="mt-2 text-center text-sm text-[var(--color-text-secondary)]">
                    {card.caption}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="mx-auto max-w-5xl px-6 py-16 md:px-10 md:py-20">
        <Eyebrow>{LANDING.team.label}</Eyebrow>
        <h2 className={cn(display, "mt-3 text-3xl font-bold leading-tight text-teal-900 md:text-4xl")}>
          {LANDING.team.headline}
        </h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {LANDING.team.members.map((m) => (
            <div
              key={m.name}
              className="flex gap-4 rounded-2xl border border-warm-200 bg-[var(--color-surface-card)] p-6"
            >
              <span
                className={cn(
                  display,
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white",
                  AVATARS[m.tone]
                )}
                aria-hidden="true"
              >
                {m.initials}
              </span>
              <div>
                <h3 className="text-lg font-bold text-teal-900">{m.name}</h3>
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-clay-600">{m.role}</p>
                <p className="mt-2 leading-relaxed text-[var(--color-text-secondary)]">{m.bio}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Join */}
      <section className="px-6 pb-16 md:px-10">
        <div className="mx-auto max-w-5xl rounded-3xl bg-teal-900 px-6 py-10 text-warm-50 md:px-12 md:py-14">
          <h2 className={cn(display, "text-3xl font-bold md:text-4xl")}>{LANDING.join.title}</h2>
          <p className="mt-3 max-w-xl text-lg text-teal-100">{LANDING.join.body}</p>
          <div className="mt-7 max-w-xl">
            <WaitlistForm refCode={refCode} tone="dark" id="footer" />
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-5xl px-6 pb-10 text-center text-sm text-[var(--color-text-muted)] md:px-10">
        <p>{LANDING.disclaimer}</p>
        <p className="mt-3">
          &copy; {new Date().getFullYear()} Health Bean LLC ·{" "}
          <Link href="/terms" className="underline-offset-2 hover:underline">
            Terms
          </Link>{" "}
          ·{" "}
          <Link href="/privacy" className="underline-offset-2 hover:underline">
            Privacy
          </Link>
        </p>
      </footer>
    </main>
  );
}
