"use client";

import { useEffect, useState } from "react";
import { LANDING_HERO } from "@/lib/landing-content";
import { EarlyAccessForm } from "./early-access-form";

// The healthbean.io hero: an insight types itself out, the confidence counts up,
// the contributing foods pop in, then the headline and form take over.
// Plain CSS animation (no motion library); reduced-motion users get the end state.

const POP_DELAYS = ["", "[animation-delay:150ms]", "[animation-delay:300ms]"];

type Phase = "badge" | "typing" | "stats" | "foods" | "reveal";

function useTypingEffect(text: string, start: boolean, speed = 35) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start || count >= text.length) return;
    const t = setTimeout(() => setCount((c) => c + 1), speed);
    return () => clearTimeout(t);
  }, [start, count, text.length, speed]);
  return text.slice(0, count);
}

function useCountUp(target: number, start: boolean, duration = 1500) {
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

export function InsightAnimation({ refCode }: { refCode?: string }) {
  const [phase, setPhase] = useState<Phase>("badge");
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of a media query after mount
      setPhase("reveal");
      return;
    }
    const timers = [
      setTimeout(() => setPhase("typing"), 1500),
      setTimeout(() => setPhase("stats"), 7000),
      setTimeout(() => setPhase("foods"), 9000),
      setTimeout(() => setLeaving(true), 11000),
      setTimeout(() => setPhase("reveal"), 11800),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const at = (p: Phase) => {
    const order: Phase[] = ["badge", "typing", "stats", "foods", "reveal"];
    return order.indexOf(phase) >= order.indexOf(p);
  };
  const typed = useTypingEffect(LANDING_HERO.insight, at("typing"));
  const confidence = useCountUp(LANDING_HERO.confidence, at("stats"));

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      {phase !== "reveal" ? (
        <div
          className={`w-full max-w-2xl text-center transition-all duration-700 ${
            leaving ? "-translate-y-5 opacity-0" : "opacity-100"
          }`}
        >
          <div className="lp-pop mb-8 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 ring-1 ring-inset ring-white/20 backdrop-blur-sm">
            <span className="text-sm text-amber-200" aria-hidden="true">⚠</span>
            <span className="text-sm font-semibold text-white/85">{LANDING_HERO.badge}</span>
          </div>

          {at("typing") && (
            <div className="mx-auto min-h-[5rem] max-w-xl md:min-h-[6rem]">
              <p className="font-[family-name:var(--font-display)] text-xl font-semibold leading-snug text-white md:text-2xl lg:text-3xl">
                {typed}
                {typed.length < LANDING_HERO.insight.length && (
                  <span className="ml-1 inline-block h-6 w-0.5 animate-pulse bg-white/60 md:h-7" />
                )}
              </p>
            </div>
          )}

          {at("stats") && (
            <div className="lp-fade-up mt-8">
              <div className="text-5xl font-bold text-white md:text-6xl">
                {confidence}
                <span className="text-white/50">%</span>
              </div>
              <div className="mt-2 text-sm text-white/60">correlation confidence</div>
            </div>
          )}

          {at("foods") && (
            <div className="lp-fade-up mt-6 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs text-white/55">Contributing foods:</span>
              {LANDING_HERO.foods.map((food, i) => (
                <span
                  key={food}
                  className={`lp-pop ${POP_DELAYS[i] ?? ""} rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80 ring-1 ring-inset ring-white/15`}
                >
                  {food}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="lp-fade-up w-full max-w-2xl text-center">
          <h1 className="text-balance text-3xl font-bold leading-snug tracking-tight text-white md:text-4xl lg:text-5xl">
            {LANDING_HERO.headline}
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-pretty text-base leading-relaxed text-white/75 md:text-lg">
            {LANDING_HERO.subtitle}
          </p>
          <div className="mx-auto mt-8 w-full max-w-md">
            <EarlyAccessForm refCode={refCode} />
          </div>
        </div>
      )}
    </div>
  );
}
