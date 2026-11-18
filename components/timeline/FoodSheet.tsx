"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { FitSymbol } from "@/components/foods/FitSymbol";
import { PersonalRatingPicker } from "@/components/foods/PersonalRatingPicker";
import { arrangeProperties } from "@/components/foods/FoodPropertyCard";
import { PROPERTY_LABELS } from "@/components/foods/FoodPropertyTag";
import { FIT_TONE_CLASS, fitLine, shortDietName, type FoodFit, type PersonalRating } from "@/lib/protocols/fit-line";
import { logLink, meterSteps, protocolWhy, type PropertyPatternLike } from "@/lib/foods/food-sheet";
import { cn } from "@/lib/utils";
import type { TriggerLevel } from "@/types";

const VERDICT_WORD = { allowed: "Allowed", limit: "Limit", avoid: "Avoid", unknown: "Not rated yet" } as const;
const TILE = {
  allowed: "bg-teal-600/10",
  limit: "bg-ochre-500/12",
  avoid: "bg-brick-600/10",
  unknown: "bg-warm-100",
} as const;
const LEVEL_WORD: Record<string, string> = { low: "Low", moderate: "Moderate", high: "High", very_high: "Very high" };

export interface FoodSheetProps {
  /** The tapped row's bottom edge (viewport px): the panel first stops just under it. */
  anchorBottom: number;
  name: string;
  /** "Lunch · 12:10 PM · Leftover" */
  meta: string;
  properties: Record<string, unknown> | null;
  fit: FoodFit | null;
  foodId: string | null;
  canRate: boolean;
  personal: PersonalRating | null;
  onPersonalChange: (next: PersonalRating | null) => void;
  patterns: PropertyPatternLike[];
  onClose: () => void;
}

/** The panel never stops higher than this share of the screen, nor lower. */
const MIN_STOP = 0.2;
const MAX_STOP = 0.62;
/** Height of the app header the panel rises to at full height. */
const HEADER = 56;

/**
 * A food, opened. Answers one question, "is this food a problem for me?", in
 * three voices, top to bottom: your protocol, your log, you. Then what's in
 * it, as small meters. A panel that slides up over the day and first stops
 * just under the food you tapped (still highlighted behind it), then rises to
 * full height when you scroll or tap the handle. The day above it, Close and
 * Escape all put it away and return focus to the food.
 */
export function FoodSheet(props: FoodSheetProps) {
  const { anchorBottom, name, meta, properties, fit, foodId, canRate, personal, onPersonalChange, patterns, onClose } = props;
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [shown, setShown] = useState(false);
  const [full, setFull] = useState(false);
  const titleId = useId();

  // Where to stop: just under the tapped food, kept within sensible bounds.
  useLayoutEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    const vh = window.innerHeight;
    const stop = Math.min(Math.max(anchorBottom + 8, vh * MIN_STOP), vh * MAX_STOP);
    el.style.setProperty("--sheet-stop", `${Math.max(0, stop - HEADER)}px`);
  }, [anchorBottom]);

  // Slide in on the next frame, so the transition runs; lock the page behind it.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    document.documentElement.classList.add("overflow-hidden");
    // Everything behind the panel is out of reach (keyboard, taps, screen readers) while it's open.
    const behind = [...document.body.children].filter((el) => !el.contains(sheetRef.current));
    behind.forEach((el) => el.setAttribute("inert", ""));
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      cancelAnimationFrame(raf);
      document.documentElement.classList.remove("overflow-hidden");
      behind.forEach((el) => el.removeAttribute("inert"));
    };
  }, []);

  const close = useCallback(() => {
    setShown(false);
    setFull(false);
    window.setTimeout(onClose, 260);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const diet = fit?.diet ? shortDietName(fit.diet) : null;
  const dietLine = diet && fit ? fitLine({ ...fit, personal: null }) : null;
  const link = logLink(properties, patterns);
  const list = Object.entries(properties ?? {})
    .filter(([k, v]) => PROPERTY_LABELS[k] || k === "histamine_liberator" ? v !== null && v !== undefined && v !== "unknown" : false)
    .map(([k, v]) => ({
      key: k,
      label: k === "histamine_liberator" ? "Releases histamine" : PROPERTY_LABELS[k],
      value: v as boolean | TriggerLevel,
      type: (typeof v === "boolean" ? "boolean" : "level") as "boolean" | "level",
    }))
    .filter((p) => !(p.key === "histamine_liberator" && p.value === false));
  const { notable, quiet } = arrangeProperties(list);

  return createPortal(
    <div className="fixed inset-0 z-50" role="presentation">
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={close}
        className={cn(
          "absolute inset-0 bg-[var(--color-scrim)] transition-opacity duration-300 motion-reduce:transition-none",
          shown ? (full ? "opacity-100" : "opacity-60") : "opacity-0"
        )}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onScroll={(e) => e.currentTarget.scrollTop > 8 && setFull(true)}
        onWheel={(e) => e.deltaY > 0 && setFull(true)}
        className={cn(
          "absolute inset-x-0 bottom-0 top-14 overflow-y-auto overscroll-contain rounded-t-3xl bg-[var(--color-surface-card)] px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-[var(--shadow-float)]",
          "transition-transform duration-500 ease-[cubic-bezier(.22,.9,.3,1)] motion-reduce:transition-none",
          !shown ? "translate-y-full" : full ? "translate-y-0" : "translate-y-[var(--sheet-stop)]"
        )}
      >
        <div className="mx-auto max-w-2xl">
          <button
            type="button"
            onClick={() => setFull((f) => !f)}
            aria-label={full ? "Show less" : "Show more"}
            className="mx-auto -mb-4 flex min-h-11 w-full items-start justify-center pt-2"
          >
            <span className="h-1 w-10 rounded-full bg-warm-300" aria-hidden="true" />
          </button>
          {!full && <p className="-mt-1 text-center text-xs text-[var(--color-text-muted)]">Scroll for more</p>}

          <div className="mt-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id={titleId} className="font-[family-name:var(--font-display)] text-3xl font-semibold leading-tight text-warm-900">
                {name}
              </h2>
              {meta && <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">{meta}</p>}
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              className="-mr-2 min-h-11 shrink-0 rounded-lg px-2 text-sm font-semibold text-teal-700 hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-teal-500"
            >
              Close
            </button>
          </div>

          {dietLine && diet && (
            <section aria-label="Your protocol" className="mt-4 border-t border-[var(--color-border-light)] pt-4">
              <h3 className="text-sm font-semibold text-warm-700">Your protocol</h3>
              <p className={cn("mt-2 flex items-center gap-2.5", FIT_TONE_CLASS[dietLine.tone].text)}>
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", TILE[dietLine.tone])}>
                  <FitSymbol tone={dietLine.tone} className="h-4 w-4" />
                </span>
                <span className="font-[family-name:var(--font-display)] text-[28px] font-semibold leading-none">
                  {VERDICT_WORD[dietLine.tone]}
                </span>
              </p>
              <p className="mt-2 max-w-[65ch] text-[15px] leading-snug text-warm-700">{protocolWhy(name, diet, dietLine, properties)}</p>
            </section>
          )}

          {link && (
            <section aria-label="Your log" className="mt-4 border-t border-[var(--color-border-light)] pt-4">
              <h3 className="text-sm font-semibold text-warm-700">Your log</h3>
              {/* One dot per day, up to 20; beyond that the sentence carries it alone. */}
              {link.total <= 20 && (
                <p className="mt-2 flex flex-wrap gap-1.5" aria-hidden="true">
                  {Array.from({ length: link.total }, (_, i) => (
                    <span
                      key={i}
                      className={cn("h-4 w-4 rounded-full border-[1.5px] border-clay-500", i < link.days && "bg-clay-500")}
                    />
                  ))}
                </p>
              )}
              <p className="mt-2 max-w-[65ch] text-[15px] leading-snug text-warm-700">
                <b className="font-semibold text-warm-900">{link.lead}</b> {link.rest}
              </p>
              <Link
                href={`/insights?focus=${encodeURIComponent(link.noun)}`}
                className="-ml-1 inline-flex min-h-11 items-center gap-0.5 rounded-lg px-1 text-sm font-semibold text-teal-700 hover:text-teal-800 focus-visible:outline-2 focus-visible:outline-teal-500"
              >
                See it in Insights
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </section>
          )}

          {canRate && foodId && (
            <section aria-label="You" className="mt-4 border-t border-[var(--color-border-light)] pt-4">
              <h3 className="mb-2 text-sm font-semibold text-warm-700">You</h3>
              <PersonalRatingPicker layout="segmented" foodId={foodId} foodName={name} value={personal} onChange={onPersonalChange} />
            </section>
          )}

          {(notable.length > 0 || quiet.length > 0) && (
            <section aria-label="What's in it" className="mt-4 border-t border-[var(--color-border-light)] pt-4">
              <h3 className="text-sm font-semibold text-[var(--color-text-muted)]">What&rsquo;s in it</h3>
              <dl className="mt-2">
                {notable.map((p) => (
                  <div key={p.label} className="grid grid-cols-[1fr_auto_4.75rem] items-center gap-3 py-1">
                    <dt className="text-sm text-warm-900">{p.label}</dt>
                    <span className="flex gap-0.5" aria-hidden="true">
                      {p.type === "boolean" ? (
                        <span className="h-2 w-[5.25rem] rounded-sm bg-warm-400" />
                      ) : (
                        [1, 2, 3, 4].map((n) => (
                          <span key={n} className={cn("h-2 w-5 rounded-sm", n <= meterSteps(p.value) ? "bg-warm-400" : "bg-warm-200")} />
                        ))
                      )}
                    </span>
                    <dd className="text-right text-[13px] text-warm-600">{p.type === "boolean" ? "Yes" : LEVEL_WORD[p.value as string]}</dd>
                  </div>
                ))}
              </dl>
              {quiet.length > 0 && <p className="mt-1 text-xs text-[var(--color-text-muted)]">Low or none: {quiet.join(", ")}</p>}
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                From published lab studies and public health data. Not yet reviewed by a clinician.
              </p>
            </section>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
