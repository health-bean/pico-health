import { FlaskConical, ClipboardCheck, TrendingUp, LayoutList } from "lucide-react";
import { LANDING_FEATURES } from "@/lib/landing-content";

// One tint per feature: clay, cream (the surface's own darker step), teal, ochre.
const ICONS = [
  { Icon: FlaskConical, tile: "bg-clay-50 text-clay-600" },
  { Icon: ClipboardCheck, tile: "bg-surface-overlay text-warm-800" },
  { Icon: TrendingUp, tile: "bg-teal-50 text-teal-700" },
  { Icon: LayoutList, tile: "bg-ochre-500/15 text-ochre-700" },
];

export function Features() {
  return (
    <div className="mx-auto max-w-5xl">
      <h2 className="text-balance text-center text-3xl font-bold leading-tight md:text-4xl">{LANDING_FEATURES.headline}</h2>
      <ul className="mt-10 grid gap-4 md:grid-cols-2">
        {LANDING_FEATURES.items.map((item, i) => {
          const { Icon, tile } = ICONS[i];
          return (
            <li key={item.title} className="flex gap-4 rounded-2xl border border-lp-cream-dark bg-surface-card p-5">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tile}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-base font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-lp-muted">{item.body}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
