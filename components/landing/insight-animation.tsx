"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { LANDING_HERO } from "@/lib/landing-content";

// The hero's one authored moment: a pattern types itself out, the share of
// days counts up, and the foods behind it appear. It plays beside the
// headline and form, which are visible from the first frame.
// Plain CSS animation; reduced-motion users get the finished card.

const POP_DELAYS = ["", "[animation-delay:120ms]", "[animation-delay:240ms]"];

type Phase = "waiting" | "typing" | "stats" | "foods";
const ORDER: Phase[] = ["waiting", "typing", "stats", "foods"];

function useTypingEffect(text: string, start: boolean, speed = 24) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start || count >= text.length) return;
    const t = setTimeout(() => setCount((c) => c + 1), speed);
    return () => clearTimeout(t);
  }, [start, count, text.length, speed]);
  return text.slice(0, count);
}

function useCountUp(target: number, start: boolean, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let frame = 0;
    const startTime = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - startTime) / duration, 1);
      setValue(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, start, duration]);
  return value;
}

export function InsightAnimation() {
  const [phase, setPhase] = useState<Phase>("waiting");
  const [still, setStill] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = setTimeout(() => setStill(true), 0);
      return () => clearTimeout(t);
    }
    const typingMs = LANDING_HERO.insight.length * 24;
    const timers = [
      setTimeout(() => setPhase("typing"), 500),
      setTimeout(() => setPhase("stats"), 700 + typingMs),
      setTimeout(() => setPhase("foods"), 1700 + typingMs),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const at = (p: Phase) => still || ORDER.indexOf(phase) >= ORDER.indexOf(p);
  const typed = useTypingEffect(LANDING_HERO.insight, at("typing") && !still);
  const counted = useCountUp(LANDING_HERO.percent, at("stats") && !still);
  const text = still ? LANDING_HERO.insight : typed;
  const percent = still ? LANDING_HERO.percent : counted;

  return (
    <figure className="rounded-2xl bg-lp-900/55 p-6 shadow-[0_24px_48px_-24px_rgb(10_40_44/0.6)] ring-1 ring-inset ring-white/12 md:p-8">
      <figcaption className="inline-flex items-center gap-2 rounded-full bg-gold-400/15 px-3 py-1.5 text-xs font-semibold text-gold-400">
        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
        {LANDING_HERO.badge}
      </figcaption>

      <p className="sr-only">
        {LANDING_HERO.insight} {LANDING_HERO.percent}% {LANDING_HERO.percentLabel}. {LANDING_HERO.foodsLabel}{" "}
        {LANDING_HERO.foods.join(", ")}.
      </p>

      <div aria-hidden="true">
        <p className="mt-5 min-h-[7.5rem] font-[family-name:var(--font-display)] text-xl font-semibold leading-snug text-surface md:min-h-[8.5rem] md:text-2xl">
          {text}
          {!still && text.length < LANDING_HERO.insight.length && at("typing") && (
            <span className="ml-1 inline-block h-5 w-0.5 animate-pulse bg-surface/60 align-middle md:h-6" />
          )}
        </p>

        <div className={`mt-4 flex items-end gap-3 transition-opacity duration-500 ${at("stats") ? "opacity-100" : "opacity-0"}`}>
          <span className="font-[family-name:var(--font-display)] text-5xl font-bold leading-none tabular-nums text-gold-400 md:text-6xl">
            {percent}
            <span className="text-gold-400/60">%</span>
          </span>
          <span className="pb-1 text-sm text-surface/75">{LANDING_HERO.percentLabel}</span>
        </div>

        <div className={`mt-6 flex min-h-8 flex-wrap items-center gap-2 ${at("foods") ? "" : "invisible"}`}>
          <span className="text-xs text-surface/70">{LANDING_HERO.foodsLabel}</span>
          {at("foods") &&
            LANDING_HERO.foods.map((food, i) => (
              <span
                key={food}
                className={`lp-pop ${POP_DELAYS[i] ?? ""} rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-surface ring-1 ring-inset ring-white/15`}
              >
                {food}
              </span>
            ))}
        </div>
      </div>
    </figure>
  );
}
