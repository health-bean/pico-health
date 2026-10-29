import { LANDING_SHOWCASE, LANDING_QUOTE } from "@/lib/landing-content";
import { TrendingUp, Calendar, AlertTriangle } from "lucide-react";

const ENTRY_ICONS = {
  Meal: { bg: "bg-emerald-50", text: "text-emerald-600", label: "Food" },
  Supplement: { bg: "bg-purple-50", text: "text-purple-700", label: "Supplement" },
  Symptom: { bg: "bg-red-50", text: "text-red-600", label: "Symptom" },
  Exposure: { bg: "bg-amber-50", text: "text-amber-700", label: "Exposure" },
  Cycle: { bg: "bg-pink-50", text: "text-pink-700", label: "Cycle" },
} as const;

const TASK_STYLES = {
  overdue: {
    strip: "bg-red-500",
    badge: "bg-red-50 text-red-600 ring-red-600/15",
    label: "Overdue",
  },
  soon: {
    strip: "bg-amber-400",
    badge: "bg-amber-50 text-amber-700 ring-amber-600/15",
    label: "Due Soon",
  },
  scheduled: {
    strip: "bg-neutral-300",
    badge: "bg-neutral-100 text-neutral-600 ring-neutral-400/15",
    label: "Scheduled",
  },
} as const;

const CORRELATION_STYLES = {
  high: "bg-red-50 text-red-700 ring-red-600/20",
  moderate: "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
  low: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
} as const;

function InsightCard() {
  const { insight } = LANDING_SHOWCASE;
  return (
    <div className="rounded-2xl border border-neutral-200/60 bg-white p-4 shadow-sm">

      {/* Icon + badge row — matches real ChewIQ pattern */}
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
          <TrendingUp className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/15">
              <AlertTriangle className="mr-1 inline h-2.5 w-2.5" />
              {insight.badge}
            </span>
            <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-medium text-neutral-600">
              {insight.confidence} confidence
            </span>
          </div>
        </div>
      </div>

      {/* Insight prose — like real ChewIQ */}
      <p className="mb-3 text-sm font-medium leading-snug">
        {insight.title}
      </p>

      {/* Contributing food chips — matches real ChewIQ pattern */}
      {"foods" in insight && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          <span className="text-[10px] text-lp-muted">Contributing foods:</span>
          {insight.foods.map((food) => (
            <span
              key={food}
              className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-700"
            >
              {food}
            </span>
          ))}
        </div>
      )}

      {/* Food sensitivity correlations — matches real ChewIQ FoodPropertyCard */}
      {"correlations" in insight && (
        <div className="mt-3 border-t border-neutral-100 pt-3">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-lp-muted">
            Food Sensitivity Correlations
          </div>
          <div className="flex flex-wrap gap-1.5">
            {insight.correlations.map((c) => (
              <span
                key={c.property}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${CORRELATION_STYLES[c.level]}`}
              >
                <span className="font-semibold">{c.property}</span>
                <span className="opacity-70">{c.percent}%</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineCard() {
  const { timeline } = LANDING_SHOWCASE;
  return (
    <div className="rounded-2xl border border-neutral-200/60 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-lp-accent-bg text-lp-accent">
          <Calendar className="h-4 w-4" />
        </div>
        <p className="text-xs text-lp-muted">{timeline.date}</p>
      </div>

      {/* Standalone card rows — matches real ChewIQ timeline */}
      <div className="flex flex-col gap-2">
        {timeline.entries.map((entry) => {
          const style = ENTRY_ICONS[entry.type];
          return (
            <div
              key={entry.time}
              className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-white px-3 py-2.5"
            >
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${style.bg}`}
              >
                <span className={`text-[8px] font-bold ${style.text}`}>
                  {style.label.charAt(0)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-lp-muted">{entry.time}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-medium ring-1 ring-inset ${style.bg} ${style.text} ring-current/15`}
                  >
                    {style.label}
                  </span>
                </div>
                <p className="truncate text-xs font-medium">
                  {entry.description}
                </p>
                {"note" in entry && entry.note && (
                  <span className="text-[9px] text-emerald-700">
                    ✓ {entry.note}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HomeHealthCard() {
  const { homeHealth } = LANDING_SHOWCASE;
  const circumference = 2 * Math.PI * 38;
  const offset = circumference * (1 - homeHealth.score / 100);

  return (
    <div className="rounded-2xl border border-neutral-200/60 bg-white p-4 shadow-sm">
      <div className="mb-4 text-center">
        {/* Score ring — matches real HoneyDoIQ: 100px, strokeWidth 8, amber→emerald */}
        <div className="relative mx-auto mb-2 h-[100px] w-[100px]">
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="none"
              stroke="#f3ede3"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="none"
              stroke="url(#scoreGradient)"
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
            <defs>
              <linearGradient
                id="scoreGradient"
                x1="0"
                y1="0"
                x2="1"
                y2="1"
              >
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#16a34a" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-extrabold">{homeHealth.score}</span>
            <span className="text-[10px] font-semibold text-neutral-400">
              Health
            </span>
          </div>
        </div>

        {/* Category sub-scores — distinctive real HoneyDoIQ pattern */}
        <div className="mx-auto flex max-w-[200px] justify-between text-[10px]">
          <div>
            <span className="text-neutral-400">Safety</span>{" "}
            <span className="font-semibold text-emerald-600">92%</span>
          </div>
          <div>
            <span className="text-neutral-400">Prevention</span>{" "}
            <span className="font-semibold text-amber-600">78%</span>
          </div>
          <div>
            <span className="text-neutral-400">Efficiency</span>{" "}
            <span className="font-semibold text-emerald-600">85%</span>
          </div>
        </div>
      </div>

      {/* Task rows — matches real HoneyDoIQ structure */}
      <div className="flex flex-col gap-2">
        {homeHealth.tasks.map((task) => {
          const style = TASK_STYLES[task.status];
          return (
            <div
              key={task.name}
              className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-3.5 py-3"
            >
              <div
                className={`h-8 w-1 shrink-0 rounded-full ${style.strip}`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold">{task.name}</p>
                <p className="text-[10px] text-neutral-400">{task.detail}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ring-1 ring-inset ${style.badge}`}
              >
                {style.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Approach() {
  return (
    <section id="approach" className="px-6 py-lp-section md:px-12">
      <blockquote className="mx-auto max-w-2xl text-balance text-center font-[family-name:var(--font-display)] text-xl italic leading-relaxed text-lp-800 md:text-2xl">
        &ldquo;{LANDING_QUOTE}&rdquo;
      </blockquote>
      <div className="mt-12 text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-lp-700">
          {LANDING_SHOWCASE.label}
        </span>
      </div>
      <div className="mx-auto mt-8 grid max-w-4xl gap-5 md:grid-cols-3">
        <InsightCard />
        <TimelineCard />
        <div>
          <HomeHealthCard />
          <p className="mt-2 text-center text-xs text-lp-muted">{LANDING_SHOWCASE.homeHealth.caption}</p>
        </div>
      </div>
    </section>
  );
}
