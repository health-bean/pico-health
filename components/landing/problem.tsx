import { LANDING_PROBLEM } from "@/lib/landing-content";

export function Problem() {
  const [stat] = LANDING_PROBLEM.stats;
  return (
    <section id="problem" className="px-6 pt-lp-section md:px-12">
      <div className="mx-auto grid max-w-5xl items-start gap-8 md:grid-cols-[1fr_auto] md:gap-14">
        <div>
          <h2 className="max-w-2xl text-balance text-3xl font-bold leading-tight md:text-4xl">
            {LANDING_PROBLEM.headline}
          </h2>
          <p className="mt-5 max-w-[65ch] text-pretty text-base leading-relaxed md:text-lg">
            {LANDING_PROBLEM.body}
          </p>
        </div>
        <div className="rounded-2xl border border-lp-cream-dark bg-surface-card px-8 py-6 text-center shadow-[0_8px_24px_-16px_rgb(90_70_20/0.35)] md:mt-2">
          <div className="font-[family-name:var(--font-display)] text-5xl font-bold text-clay-600">{stat.value}</div>
          <div className="mt-2 whitespace-pre-line text-sm text-lp-muted">{stat.description}</div>
          <a href="https://www.cdc.gov/pcd/issues/2025/24_0539.htm" className="mt-2 inline-block text-xs text-lp-muted underline decoration-lp-cream-dark underline-offset-2 hover:text-lp-800">
            Source: {stat.source}
          </a>
        </div>
      </div>
    </section>
  );
}
