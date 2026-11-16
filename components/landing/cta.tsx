import { LANDING_CTA } from "@/lib/landing-content";
import { EarlyAccessForm } from "./early-access-form";

export function Cta({ refCode }: { refCode?: string }) {
  return (
    <section id="early-access" className="px-6 pb-lp-section md:px-12">
      <div className="mx-auto max-w-5xl rounded-3xl bg-lp-900 px-6 py-12 md:px-14 md:py-14">
        <div className="max-w-xl">
          <h2 className="text-3xl font-bold leading-tight text-surface md:text-4xl">{LANDING_CTA.headline}</h2>
          <p className="mt-3 text-base leading-relaxed text-surface/80">{LANDING_CTA.body}</p>
          <div className="mt-8 max-w-md">
            <EarlyAccessForm id="footer" tone="dark" refCode={refCode} />
          </div>
          <p className="mt-3 text-sm text-surface/70">{LANDING_CTA.note}</p>
        </div>
      </div>
    </section>
  );
}
