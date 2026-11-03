import { InsightAnimation } from "./insight-animation";

export function Hero({ refCode }: { refCode?: string }) {
  return (
    <section className="relative bg-gradient-to-br from-lp-900 via-lp-800 to-lp-600">
      {/* Cream overlay shaped so the teal rises in a soft arc out of the header. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1000 64"
        preserveAspectRatio="none"
        className="absolute inset-x-0 top-0 h-10 w-full text-surface md:h-16"
      >
        <path d="M0 0H1000V64C700 0 300 0 0 64Z" fill="currentColor" />
      </svg>
      <InsightAnimation refCode={refCode} />
    </section>
  );
}
