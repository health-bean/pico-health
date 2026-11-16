import { FlaskConical, ClipboardCheck, TrendingUp, LayoutList } from "lucide-react";
import { LANDING_FEATURES } from "@/lib/landing-content";

const ICONS = [FlaskConical, ClipboardCheck, TrendingUp, LayoutList];

export function Features() {
  return (
    <div className="mx-auto mt-12 max-w-3xl">
      <div className="text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-lp-700">
          {LANDING_FEATURES.label}
        </span>
        <h2 className="mt-3 text-balance text-2xl font-bold leading-snug md:text-3xl">
          {LANDING_FEATURES.headline}
        </h2>
      </div>
      <ul className="mt-8 grid gap-6 md:grid-cols-2 md:gap-x-10">
        {LANDING_FEATURES.items.map((item, i) => {
          const Icon = ICONS[i];
          return (
            <li key={item.title} className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-lp-accent-bg text-lp-accent">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-lp-muted">{item.body}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
