import { LANDING_HERO } from "@/lib/landing-content";
import { EarlyAccessForm } from "./early-access-form";
import { InsightAnimation } from "./insight-animation";

export function Hero({ refCode }: { refCode?: string }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-lp-900 via-lp-800 to-lp-700">
      {/* Cream overlay shaped so the teal rises in a soft arc out of the header. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1000 64"
        preserveAspectRatio="none"
        className="absolute inset-x-0 top-0 h-10 w-full text-surface md:h-16"
      >
        <path d="M0 0H1000V64C700 0 300 0 0 64Z" fill="currentColor" />
      </svg>
      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-6 pt-20 pb-16 md:grid-cols-[1.05fr_1fr] md:gap-14 md:px-12 md:pt-28 md:pb-24">
        <div>
          <h1 className="text-balance text-4xl font-bold leading-[1.1] tracking-tight text-surface md:text-5xl lg:text-6xl">
            {LANDING_HERO.headline}
          </h1>
          <p className="mt-5 max-w-md text-pretty text-lg font-semibold leading-snug text-gold-400 md:text-xl">
            {LANDING_HERO.subtitle}
          </p>
          <div className="mt-8 max-w-md">
            <EarlyAccessForm id="hero" tone="dark" refCode={refCode} />
          </div>
        </div>
        <InsightAnimation />
      </div>
    </section>
  );
}
