import { InsightAnimation } from "./insight-animation";

export function Hero({ refCode }: { refCode?: string }) {
  return (
    <section className="relative bg-gradient-to-br from-lp-900 via-lp-800 to-lp-600">
      <InsightAnimation refCode={refCode} />
    </section>
  );
}
