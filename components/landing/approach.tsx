import { LANDING_SHOWCASE, LANDING_QUOTE } from "@/lib/landing-content";
import { BookHeart, Calendar, Check, Eye, FlaskConical, ListChecks, Search } from "lucide-react";
import { Features } from "./features";

// Example screens. Colors and wording follow the app itself: teal for
// allowed, ochre (warning) for limit/avoid, "on 5 of 7 days" for patterns.
const ENTRY_LABEL_STYLE = "rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700";

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-warm-200 bg-surface-card p-4 shadow-sm">{children}</div>;
}

function CardHeader({ icon: Icon, label }: { icon: typeof Eye; label: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <p className="text-xs font-medium text-warm-600">{label}</p>
    </div>
  );
}

function InsightCard() {
  const { insight } = LANDING_SHOWCASE;
  return (
    <Card>
      <CardHeader icon={Eye} label={insight.section} />
      <div className="flex items-start gap-3 rounded-xl bg-ochre-500/10 p-3">
        <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-ochre-700" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-warm-900">{insight.title}</p>
          <p className="mt-1 text-xs text-warm-600">{insight.lines.join(" · ")}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-warm-600">{insight.foodsLabel}</span>
        {insight.foods.map((food) => (
          <span key={food} className="rounded-md bg-warm-100 px-1.5 py-0.5 text-[11px] font-medium text-warm-700">
            {food}
          </span>
        ))}
      </div>
      <p className="mt-3 border-t border-warm-100 pt-3 text-[11px] text-warm-600">{insight.note}</p>
    </Card>
  );
}

function TimelineCard() {
  const { timeline } = LANDING_SHOWCASE;
  return (
    <Card>
      <CardHeader icon={Calendar} label={timeline.date} />
      <p className="mb-2 flex items-center gap-2 px-1 text-xs text-warm-600">
        <BookHeart className="h-3.5 w-3.5 shrink-0 text-teal-600" aria-hidden="true" />
        {timeline.reflect}
      </p>
      <div className="flex flex-col gap-2">
        {timeline.entries.map((entry) => (
          <div key={entry.time} className="rounded-xl border border-warm-100 bg-surface-card px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-warm-600">{entry.time}</span>
              <span className={ENTRY_LABEL_STYLE}>{entry.type}</span>
            </div>
            <p className="mt-0.5 truncate text-xs font-medium text-warm-900">{entry.description}</p>
            {"note" in entry && entry.note && (
              <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-teal-700">
                <Check className="h-3 w-3" aria-hidden="true" />
                {entry.note}
              </p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

function FoodListCard() {
  const { foodList } = LANDING_SHOWCASE;
  return (
    <Card>
      <CardHeader icon={ListChecks} label={`${foodList.title} · ${foodList.diet}`} />
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-warm-200 bg-surface-card px-3 py-2 text-xs text-warm-500">
        <Search className="h-3.5 w-3.5" aria-hidden="true" />
        Find a food
      </div>
      <div className="flex flex-col gap-3">
        {foodList.groups.map((g) => (
          <div key={g.tone}>
            <p className={`text-xs font-semibold ${g.tone === "allowed" ? "text-teal-700" : "text-warning-strong"}`}>{g.title}</p>
            <ul className="mt-1 divide-y divide-warm-100">
              {g.foods.map((f) => (
                <li key={f.name} className="flex items-baseline justify-between gap-3 py-1.5">
                  <span className="text-xs text-warm-900">{f.name}</span>
                  {f.reason && <span className="text-right text-[11px] text-warm-600">{f.reason}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function Approach() {
  return (
    <section id="approach" className="px-6 py-lp-section md:px-12">
      <blockquote className="mx-auto max-w-2xl text-balance text-center font-[family-name:var(--font-display)] text-xl italic leading-relaxed text-lp-800 md:text-2xl">
        &ldquo;{LANDING_QUOTE}&rdquo;
      </blockquote>
      <Features />
      <div className="mt-16 text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-lp-700">
          {LANDING_SHOWCASE.label}
        </span>
        <p className="mx-auto mt-3 max-w-xl text-pretty text-sm leading-relaxed md:text-base">
          {LANDING_SHOWCASE.tagline}
        </p>
      </div>
      <div className="mx-auto mt-8 grid max-w-4xl gap-5 md:grid-cols-3">
        <InsightCard />
        <TimelineCard />
        <FoodListCard />
      </div>
    </section>
  );
}
