import { Nav } from "./nav";
import { InsightAnimation } from "./insight-animation";

export function Hero({ refCode }: { refCode?: string }) {
  return (
    <section className="relative min-h-screen bg-gradient-to-br from-lp-900 via-lp-800 to-lp-600">
      <Nav />
      <InsightAnimation refCode={refCode} />
    </section>
  );
}
