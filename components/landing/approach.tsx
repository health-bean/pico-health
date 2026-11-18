import Image from "next/image";
import { LANDING_SHOWCASE, LANDING_QUOTE } from "@/lib/landing-content";
import { Features } from "./features";

// Sections alternate cream / teal so the page breaks into clear chapters:
// One continuous cream page. Separation comes from space, not stripes; the
// only dark surfaces are inset rounded panels (these examples, and the
// sign-up block), so they read as showpieces rather than slices.
export function Approach() {
  return (
    <>
      <section className="px-4 pt-lp-section md:px-12">
        <figure className="mx-auto max-w-4xl rounded-3xl bg-lp-800 px-6 py-12 text-center md:px-16 md:py-14">
          <div className="mx-auto h-1 w-12 rounded-full bg-lp-gold" aria-hidden="true" />
          <blockquote className="mt-6 text-balance font-[family-name:var(--font-display)] text-2xl italic leading-snug text-surface md:text-3xl">
            &ldquo;{LANDING_QUOTE}&rdquo;
          </blockquote>
        </figure>
      </section>

      <section className="px-6 pt-lp-section md:px-12">
        <Features />
      </section>

      <section id="approach" className="px-4 pt-lp-section md:px-12">
        <div className="mx-auto max-w-6xl rounded-3xl bg-lp-900 px-5 py-12 shadow-[0_24px_48px_-28px_rgb(10_40_44/0.55)] md:px-12 md:py-16">
          <h2 className="text-balance text-center text-3xl font-bold leading-tight text-surface md:text-4xl">{LANDING_SHOWCASE.headline}</h2>
          {/* The same three screens as the community PDF. */}
          <div className="mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-3">
            {LANDING_SHOWCASE.screens.map((screen) => (
              <Image
                key={screen.src}
                src={screen.src}
                alt={screen.alt}
                width={LANDING_SHOWCASE.width}
                height={LANDING_SHOWCASE.height}
                sizes="(min-width: 768px) 33vw, 100vw"
                className="mx-auto h-auto w-full max-w-sm rounded-2xl"
              />
            ))}
          </div>
          <p className="mx-auto mt-12 max-w-2xl text-balance text-center font-[family-name:var(--font-display)] text-xl italic leading-snug text-lp-gold md:text-2xl">
            {LANDING_SHOWCASE.tagline}
          </p>
        </div>
      </section>
    </>
  );
}
