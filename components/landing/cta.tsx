import { LANDING_CTA } from "@/lib/landing-content";
import { EarlyAccessForm } from "./early-access-form";

export function Cta({ refCode }: { refCode?: string }) {
  return (
    <section id="early-access" className="bg-gradient-to-b from-lp-cream to-lp-cream-dark px-6 py-lp-section text-center md:px-12">
      <h2 className="text-2xl font-bold leading-snug md:text-3xl">
        {LANDING_CTA.headline}
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-lp-muted md:text-base">
        {LANDING_CTA.body}
      </p>
      <div className="mt-8">
        <EarlyAccessForm refCode={refCode} />
      </div>
      <p className="mt-3 text-xs text-lp-muted">
        {LANDING_CTA.note}
      </p>
    </section>
  );
}
