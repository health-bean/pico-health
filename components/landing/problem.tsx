import { LANDING_PROBLEM } from "@/lib/landing-content";

export function Problem() {
  return (
    <section id="problem" className="border-b border-lp-900/10 px-6 py-lp-section text-center md:px-12">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-lp-700">
        {LANDING_PROBLEM.label}
      </span>
      <h2 className="mx-auto mt-3 max-w-xl text-balance text-2xl font-bold leading-snug md:text-3xl">
        {LANDING_PROBLEM.headline}
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-pretty text-sm leading-relaxed md:text-base">
        {LANDING_PROBLEM.body}
      </p>
      <div className="mx-auto mt-10 flex max-w-lg items-center justify-center gap-8 md:gap-12">
        {LANDING_PROBLEM.stats.map((stat, i) => (
          <div key={stat.value} className="flex items-center gap-8 md:gap-12">
            {i > 0 && (
              <div className="h-12 w-px bg-lp-900/15" aria-hidden="true" />
            )}
            <div className="text-center">
              <div className="font-[family-name:var(--font-display)] text-3xl font-bold text-lp-800 md:text-4xl">
                {stat.value}
              </div>
              <div className="mt-1 whitespace-pre-line text-xs text-lp-muted">
                {stat.description}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
