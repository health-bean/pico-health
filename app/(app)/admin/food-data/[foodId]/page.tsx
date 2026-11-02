"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ExternalLink, Loader2, Plus } from "lucide-react";
import { Badge, Button, Card, Input, Select, Textarea, useToast } from "@/components/ui";
import { RatingBadge } from "@/components/admin/rating-badge";
import { cn } from "@/lib/utils";
import { LEVELS, type RatingResult } from "@/lib/food-data/compute";
import { FLAG_LABELS, LEVEL_LABELS } from "@/lib/food-data/labels";
import { FOOD_PROPERTIES, PROPERTY_LABELS, type FoodProperty } from "@/lib/sources/properties";

interface Measurement {
  id: string;
  property: FoodProperty;
  valuePer100g: number | null;
  unit: string;
  reportedLevel: string | null;
  solublePct: number | null;
  preparation: string | null;
  sampleDescription: string | null;
  sourceName: string;
  citation: string;
  citationUrl: string | null;
  studyYear: number | null;
  excluded: boolean;
  exclusionNote: string | null;
}

interface PropertyData {
  property: FoodProperty;
  measurements: Measurement[];
  result: RatingResult;
  review: { note: string | null; reviewedBy: string; reviewedAt: string } | null;
}

interface Detail {
  food: {
    id: string;
    displayName: string;
    servingGrams: number | null;
    servingLabel: string | null;
    category: string | null;
    subcategory: string | null;
  };
  properties: PropertyData[];
}

interface Source {
  id: string;
  name: string;
  useAs: string;
  isActive: boolean;
}

const MEASURED = FOOD_PROPERTIES.filter((p) => p !== "nightshade");

/** First readable message from an API error body. */
function errorMessage(body: unknown, fallback: string): string {
  const b = body as { error?: string; details?: { formErrors?: string[]; fieldErrors?: Record<string, string[]> } } | null;
  const field = b?.details?.fieldErrors && Object.values(b.details.fieldErrors).flat()[0];
  return field || b?.details?.formErrors?.[0] || b?.error || fallback;
}

async function send(url: string, method: string, body: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, data };
}

const fmt = (n: number) => (n >= 10 ? Math.round(n).toString() : n.toFixed(1).replace(/\.0$/, ""));

function Summary({ data, food }: { data: PropertyData; food: Detail["food"] }) {
  const r = data.result;
  if (r.method === "median" && r.median !== null) {
    const unit = data.measurements[0]?.unit ?? "mg";
    return (
      <p className="text-sm text-warm-600">
        Middle value {fmt(r.median)} {unit}/100 g
        {r.perServing !== null && food.servingGrams
          ? ` → ${fmt(r.perServing)} ${unit} per serving (${food.servingLabel || `${food.servingGrams} g`})`
          : ""}
        {r.range && r.range[0] !== r.range[1] ? ` · results range ${fmt(r.range[0])}–${fmt(r.range[1])}` : ""}
        {` · ${r.counted} counted`}
      </p>
    );
  }
  if (r.method === "reported") {
    return <p className="text-sm text-warm-600">Level as stated by the source · {r.counted} counted</p>;
  }
  return <p className="text-sm text-warm-600">No counted results, so the app shows this as unknown.</p>;
}

function MeasurementRow({
  m,
  superseded,
  onChange,
}: {
  m: Measurement;
  superseded: boolean;
  onChange: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [excluding, setExcluding] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const update = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const { ok, data } = await send(`/api/admin/food-data/measurements/${m.id}`, "PATCH", body);
      if (!ok) return toast(errorMessage(data, "Could not update the result"), "error");
      setExcluding(false);
      setNote("");
      await onChange();
    } finally {
      setBusy(false);
    }
  };

  const status = m.excluded ? "Excluded" : superseded ? "Older — reference only" : "Counted";

  return (
    <li className={cn("py-3", (m.excluded || superseded) && "text-warm-500")}>
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("font-semibold tabular-nums", m.excluded ? "line-through" : "text-warm-900")}>
              {m.valuePer100g !== null
                ? `${fmt(m.valuePer100g)} ${m.unit}/100 g`
                : LEVEL_LABELS[m.reportedLevel as keyof typeof LEVEL_LABELS] ?? m.reportedLevel}
            </span>
            {m.solublePct !== null && <span className="text-sm">({fmt(m.solublePct)}% soluble)</span>}
            <Badge variant={m.excluded || superseded ? "default" : "info"}>{status}</Badge>
          </div>
          {(m.sampleDescription || m.preparation) && (
            <p className="text-sm">
              {[m.sampleDescription, m.preparation].filter(Boolean).join(" · ")}
            </p>
          )}
          <p className="text-sm">
            <span className="font-medium">{m.sourceName}</span>
            {m.studyYear ? ` · ${m.studyYear}` : ""} · {m.citation}{" "}
            {m.citationUrl && (
              <a
                href={m.citationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-teal-700 hover:underline"
              >
                link <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            )}
          </p>
          {m.excluded && m.exclusionNote && <p className="text-sm italic">Why excluded: {m.exclusionNote}</p>}
        </div>
        <div className="shrink-0">
          {m.excluded ? (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => update({ excluded: false })}>
              Include
            </Button>
          ) : (
            !excluding && (
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => setExcluding(true)}>
                Exclude
              </Button>
            )
          )}
        </div>
      </div>
      {excluding && (
        <form
          className="mt-2 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            update({ excluded: true, exclusionNote: note });
          }}
        >
          <Textarea
            id={`exclude-${m.id}`}
            label="Why exclude this result?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Tested pigeon peas, not green peas"
            required
          />
          <div className="flex gap-2">
            <Button size="sm" type="submit" disabled={busy || !note.trim()}>
              Exclude result
            </Button>
            <Button size="sm" type="button" variant="ghost" onClick={() => setExcluding(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </li>
  );
}

function SignOff({ foodId, data, onChange }: { foodId: string; data: PropertyData; onChange: () => Promise<void> }) {
  const { toast } = useToast();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const signOff = async () => {
    setBusy(true);
    try {
      const { ok, data: body } = await send(`/api/admin/food-data/${foodId}/review`, "POST", {
        property: data.property,
        note,
      });
      if (!ok) return toast(errorMessage(body, "Could not sign off"), "error");
      toast("Signed off", "success");
      setNote("");
      await onChange();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 rounded-xl bg-level-2-bg p-4 text-level-2-fg">
      <p className="flex items-center gap-2 text-sm font-medium">
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        Studies disagree: they fall in different ranks.
      </p>
      <p className="text-sm">
        Check the results below. Exclude any that don&apos;t describe this food (say why), then sign off on
        the rating.
      </p>
      <Textarea
        id={`signoff-${data.property}`}
        aria-label="Sign-off note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note, e.g. Kept the middle value; the low result was a different variety"
      />
      <Button size="sm" disabled={busy} onClick={signOff}>
        Sign off on this rating
      </Button>
    </div>
  );
}

const EMPTY_FORM = {
  property: "oxalate" as string,
  kind: "amount" as "amount" | "level",
  value: "",
  unit: "mg",
  level: "",
  soluble: "",
  preparation: "",
  sample: "",
  sourceId: "",
  citation: "",
  citationUrl: "",
  year: "",
};

function AddResult({
  foodId,
  sources,
  onDone,
  onCancel,
}: {
  foodId: string;
  sources: Source[];
  onDone: () => Promise<void>;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [f, setF] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<typeof EMPTY_FORM>) => setF((prev) => ({ ...prev, ...patch }));
  const num = (v: string) => (v.trim() === "" ? null : Number(v));

  const submit = async () => {
    setBusy(true);
    try {
      const { ok, data } = await send(`/api/admin/food-data/${foodId}/measurements`, "POST", {
        property: f.property,
        valuePer100g: f.kind === "amount" ? num(f.value) : null,
        unit: f.unit,
        reportedLevel: f.kind === "level" ? f.level || null : null,
        solublePct: f.kind === "amount" ? num(f.soluble) : null,
        preparation: f.preparation,
        sampleDescription: f.sample,
        sourceId: f.sourceId,
        citation: f.citation,
        citationUrl: f.citationUrl,
        studyYear: num(f.year),
      });
      if (!ok) return toast(errorMessage(data, "Could not add the result"), "error");
      toast("Result added", "success");
      setF(EMPTY_FORM);
      await onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Select
          id="add-property"
          label="Property"
          value={f.property}
          onChange={(v) => set({ property: v })}
          options={MEASURED.map((p) => ({ value: p, label: PROPERTY_LABELS[p] }))}
        />
        <Select
          id="add-source"
          label="Trusted source"
          value={f.sourceId}
          onChange={(v) => set({ sourceId: v })}
          placeholder="Choose a source"
          options={sources.map((s) => ({ value: s.id, label: s.name }))}
        />
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-[var(--color-text-secondary)]">The result is</legend>
        <div className="flex flex-col gap-2 text-sm text-warm-700 md:flex-row md:gap-6">
          <label className="flex min-h-9 items-center gap-2">
            <input type="radio" checked={f.kind === "amount"} onChange={() => set({ kind: "amount" })} className="accent-teal-600" />
            A lab amount <span className="text-warm-500">— e.g. 350 mg per 100 g</span>
          </label>
          <label className="flex min-h-9 items-center gap-2">
            <input type="radio" checked={f.kind === "level"} onChange={() => set({ kind: "level" })} className="accent-teal-600" />
            A level from a list <span className="text-warm-500">— e.g. SIGHI</span>
          </label>
        </div>
      </fieldset>

      {f.kind === "amount" ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Input id="add-value" label="Amount per 100 g" type="number" step="any" min="0" value={f.value} onChange={(e) => set({ value: e.target.value })} required />
          <Input id="add-unit" label="Unit" value={f.unit} onChange={(e) => set({ unit: e.target.value })} required />
          <Input id="add-soluble" label="Soluble % (optional)" type="number" step="any" min="0" max="100" value={f.soluble} onChange={(e) => set({ soluble: e.target.value })} />
        </div>
      ) : (
        <Select
          id="add-level"
          label="Level"
          value={f.level}
          onChange={(v) => set({ level: v })}
          placeholder="Choose a level"
          options={LEVELS.map((l) => ({ value: l, label: LEVEL_LABELS[l] }))}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Input id="add-sample" label="Sample as the study describes it" value={f.sample} onChange={(e) => set({ sample: e.target.value })} placeholder="e.g. Almond, dry roasted, unsalted" />
        <Input id="add-prep" label="Preparation" value={f.preparation} onChange={(e) => set({ preparation: e.target.value })} placeholder="e.g. raw, boiled 6 min" />
      </div>
      <Textarea id="add-citation" label="Citation" value={f.citation} onChange={(e) => set({ citation: e.target.value })} placeholder="Authors. Title. Journal, year." required />
      <div className="grid gap-4 md:grid-cols-[1fr_10rem]">
        <Input id="add-url" label="Link (DOI or PubMed)" type="url" value={f.citationUrl} onChange={(e) => set({ citationUrl: e.target.value })} placeholder="https://doi.org/…" />
        <Input id="add-year" label="Study year" type="number" min="1900" value={f.year} onChange={(e) => set({ year: e.target.value })} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Add result"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function ServingSize({ food, onDone }: { food: Detail["food"]; onDone: () => Promise<void> }) {
  const { toast } = useToast();
  const [grams, setGrams] = useState(food.servingGrams?.toString() ?? "");
  const [label, setLabel] = useState(food.servingLabel ?? "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const { ok, data } = await send(`/api/admin/food-data/${food.id}`, "PATCH", {
        servingGrams: grams.trim() === "" ? null : Number(grams),
        servingLabel: label,
      });
      if (!ok) return toast(errorMessage(data, "Could not save the serving size"), "error");
      toast("Serving size saved; ratings updated", "success");
      await onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="flex flex-col gap-3 md:flex-row md:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <Input id="serving-grams" label="Serving (grams)" type="number" step="any" min="0" value={grams} onChange={(e) => setGrams(e.target.value)} />
      <Input id="serving-label" label="Described as" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. 1 oz, ½ cup" />
      <Button type="submit" variant="outline" disabled={busy}>
        Save serving
      </Button>
    </form>
  );
}

export default function FoodDataDetailPage({ params }: { params: Promise<{ foodId: string }> }) {
  const { foodId } = use(params);
  const { toast } = useToast();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const fetchDetail = useCallback(async (): Promise<Detail> => {
    const res = await fetch(`/api/admin/food-data/${foodId}`);
    if (!res.ok) throw new Error(String(res.status));
    return res.json();
  }, [foodId]);

  const reload = useCallback(
    () =>
      fetchDetail()
        .then(setDetail)
        .catch(() => toast("Could not load this food", "error")),
    [fetchDetail, toast]
  );

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchDetail(),
      fetch("/api/admin/sources").then((r) => (r.ok ? r.json() : { sources: [] })),
    ])
      .then(([d, s]) => {
        if (cancelled) return;
        setDetail(d);
        setSources((s.sources as Source[]).filter((x) => x.isActive && x.useAs === "data"));
      })
      .catch(() => !cancelled && toast("Could not load this food", "error"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [fetchDetail, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-warm-500" aria-label="Loading" />
      </div>
    );
  }
  if (!detail) return <p className="text-sm text-warm-600">Food not found.</p>;

  const { food, properties } = detail;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/admin/food-data" className="mb-2 inline-flex min-h-9 items-center gap-1 text-sm text-teal-700 hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Food data
        </Link>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-warm-900">
          {food.displayName}
        </h1>
        {food.category && (
          <p className="text-sm text-warm-500">
            {food.category}
            {food.subcategory ? ` · ${food.subcategory}` : ""}
          </p>
        )}
      </div>

      <Card>
        <h2 className="mb-1 text-base font-semibold text-warm-900">Serving size</h2>
        <p className="mb-3 text-sm text-warm-500">Oxalate is ranked per serving, so it needs one.</p>
        <ServingSize food={food} onDone={reload} />
      </Card>

      {properties.map((data) => (
        <Card key={data.property}>
          <div className="mb-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-warm-900">{PROPERTY_LABELS[data.property]}</h2>
              <RatingBadge result={data.result} />
              {data.result.flags
                .filter((f) => f !== "studies_disagree")
                .map((f) => (
                  <Badge key={f}>{FLAG_LABELS[f]}</Badge>
                ))}
            </div>
            <Summary data={data} food={food} />
            {data.review && !data.result.needsReview && (
              <p className="text-sm text-warm-600">
                Signed off by {data.review.reviewedBy} on {new Date(data.review.reviewedAt).toLocaleDateString()}
                {data.review.note ? `: ${data.review.note}` : ""}
              </p>
            )}
          </div>

          {data.result.needsReview && <SignOff foodId={food.id} data={data} onChange={reload} />}

          <ul className="divide-y divide-warm-100">
            {data.measurements.map((m) => (
              <MeasurementRow key={m.id} m={m} superseded={data.result.superseded.includes(m.id)} onChange={reload} />
            ))}
          </ul>
        </Card>
      ))}

      {adding ? (
        <Card>
          <h2 className="mb-4 text-base font-semibold text-warm-900">Add a lab result</h2>
          <AddResult
            foodId={food.id}
            sources={sources}
            onCancel={() => setAdding(false)}
            onDone={async () => {
              setAdding(false);
              await reload();
            }}
          />
        </Card>
      ) : (
        <Button onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Add a lab result
        </Button>
      )}
    </div>
  );
}
