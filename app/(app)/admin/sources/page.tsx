"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, ExternalLink, Loader2, Plus } from "lucide-react";
import { Badge, Button, Card, EmptyState, Input, Textarea, useToast } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  FOOD_PROPERTIES,
  PROPERTY_LABELS,
  type FoodProperty,
  type SourceUse,
} from "@/lib/sources/properties";

interface TrustedSource {
  id: string;
  name: string;
  url: string;
  trustedFor: FoodProperty[];
  useAs: SourceUse;
  notes: string | null;
  isActive: boolean;
  createdBy: string | null;
  updatedAt: string;
}

interface FormState {
  name: string;
  url: string;
  trustedFor: FoodProperty[];
  useAs: SourceUse;
  notes: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  url: "https://",
  trustedFor: [],
  useAs: "data",
  notes: "",
  isActive: true,
};

async function fetchSources(): Promise<TrustedSource[]> {
  const res = await fetch("/api/admin/sources");
  if (!res.ok) throw new Error(`GET /api/admin/sources ${res.status}`);
  const data = await res.json();
  return data.sources;
}

/** Pull the first readable message out of an API error body. */
function errorMessage(body: unknown, fallback: string): string {
  const b = body as {
    error?: string;
    details?: { formErrors?: string[]; fieldErrors?: Record<string, string[]> };
  } | null;
  const field = b?.details?.fieldErrors && Object.values(b.details.fieldErrors).flat()[0];
  return field || b?.details?.formErrors?.[0] || b?.error || fallback;
}

function SourceForm({
  initial,
  submitLabel,
  saving,
  onSubmit,
  onCancel,
}: {
  initial: FormState;
  submitLabel: string;
  saving: boolean;
  onSubmit: (form: FormState) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormState>(initial);

  const toggleProperty = (p: FoodProperty) =>
    setForm((f) => ({
      ...f,
      trustedFor: f.trustedFor.includes(p)
        ? f.trustedFor.filter((x) => x !== p)
        : [...f.trustedFor, p],
    }));

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Name"
          id="source-name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. PubMed"
          required
        />
        <Input
          label="Web address"
          id="source-url"
          type="url"
          value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
          placeholder="https://"
          required
        />
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-[var(--color-text-secondary)]">
          Trusted for
        </legend>
        <div className="flex flex-wrap gap-2">
          {FOOD_PROPERTIES.map((p) => {
            const on = form.trustedFor.includes(p);
            return (
              <button
                key={p}
                type="button"
                aria-pressed={on}
                onClick={() => toggleProperty(p)}
                className={cn(
                  "min-h-9 rounded-full border px-3 text-sm transition-colors",
                  on
                    ? "border-teal-600 bg-teal-50 text-teal-700"
                    : "border-warm-200 text-warm-600 hover:bg-warm-100"
                )}
              >
                {PROPERTY_LABELS[p]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-[var(--color-text-secondary)]">
          Use as
        </legend>
        <div className="flex flex-col gap-2 text-sm text-warm-700 md:flex-row md:gap-6">
          <label className="flex min-h-9 items-center gap-2">
            <input
              type="radio"
              name="use-as"
              checked={form.useAs === "data"}
              onChange={() => setForm({ ...form, useAs: "data" })}
              className="accent-teal-600"
            />
            Data source <span className="text-warm-500">— ratings can cite it</span>
          </label>
          <label className="flex min-h-9 items-center gap-2">
            <input
              type="radio"
              name="use-as"
              checked={form.useAs === "reference"}
              onChange={() => setForm({ ...form, useAs: "reference" })}
              className="accent-teal-600"
            />
            Reference only <span className="text-warm-500">— background reading</span>
          </label>
        </div>
      </fieldset>

      <Textarea
        label="Notes"
        id="source-notes"
        value={form.notes}
        onChange={(e) => setForm({ ...form, notes: e.target.value })}
        placeholder="What it is and how far to trust it, e.g. tolerance scores, not lab measurements"
      />

      <label className="flex min-h-9 items-center gap-2 text-sm text-warm-700">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          className="accent-teal-600"
        />
        Active
      </label>

      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : submitLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function AdminSourcesPage() {
  const { toast } = useToast();
  const [sources, setSources] = useState<TrustedSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    () =>
      fetchSources()
        .then(setSources)
        .catch(() => toast("Could not load sources", "error"))
        .finally(() => setLoading(false)),
    [toast]
  );

  useEffect(() => {
    let cancelled = false;
    fetchSources()
      .then((rows) => !cancelled && setSources(rows))
      .catch(() => !cancelled && toast("Could not load sources", "error"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const save = async (form: FormState, id: string | null) => {
    setSaving(true);
    try {
      const res = await fetch(id ? `/api/admin/sources/${id}` : "/api/admin/sources", {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, notes: form.notes.trim() || null }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast(errorMessage(body, "Could not save the source"), "error");
        return;
      }
      toast(id ? "Source updated" : "Source added", "success");
      setAdding(false);
      setEditingId(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const toFormState = (s: TrustedSource): FormState => ({
    name: s.name,
    url: s.url,
    trustedFor: s.trustedFor,
    useAs: s.useAs,
    notes: s.notes ?? "",
    isActive: s.isActive,
  });

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-warm-900">
            Trusted sources
          </h1>
          <p className="text-sm text-warm-500">
            The only places food ratings and the coach may cite. Turn a source off instead of
            deleting it.
          </p>
        </div>
        {!adding && (
          <Button
            onClick={() => {
              setAdding(true);
              setEditingId(null);
            }}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add source
          </Button>
        )}
      </div>

      {adding && (
        <Card className="mb-6">
          <h2 className="mb-4 text-base font-semibold text-warm-900">Add trusted source</h2>
          <SourceForm
            initial={EMPTY_FORM}
            submitLabel="Save"
            saving={saving}
            onSubmit={(form) => save(form, null)}
            onCancel={() => setAdding(false)}
          />
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-warm-500" aria-label="Loading" />
        </div>
      ) : sources.length === 0 ? (
        <EmptyState
          icon={<BadgeCheck className="h-6 w-6" aria-hidden="true" />}
          title="No trusted sources yet" description="Add the first one above." />
      ) : (
        <ul className="space-y-3">
          {sources.map((s) => (
            <li key={s.id}>
              <Card className={cn(!s.isActive && "opacity-60")}>
                {editingId === s.id ? (
                  <SourceForm
                    initial={toFormState(s)}
                    submitLabel="Save changes"
                    saving={saving}
                    onSubmit={(form) => save(form, s.id)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold text-warm-900">{s.name}</h2>
                        <Badge variant={s.useAs === "data" ? "info" : "default"}>
                          {s.useAs === "data" ? "Data source" : "Reference only"}
                        </Badge>
                        {!s.isActive && <Badge>Off</Badge>}
                      </div>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex max-w-full items-center gap-1 text-sm text-teal-700 hover:underline"
                      >
                        <span className="truncate">{s.url}</span>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      </a>
                      {s.trustedFor.length > 0 && (
                        <p className="text-sm text-warm-600">
                          <span className="text-warm-500">Trusted for: </span>
                          {s.trustedFor.length === FOOD_PROPERTIES.length
                            ? "all properties"
                            : s.trustedFor.map((p) => PROPERTY_LABELS[p] ?? p).join(", ")}
                        </p>
                      )}
                      {s.notes && <p className="text-sm text-warm-600">{s.notes}</p>}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingId(s.id);
                          setAdding(false);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={saving}
                        onClick={() => save({ ...toFormState(s), isActive: !s.isActive }, s.id)}
                      >
                        {s.isActive ? "Turn off" : "Turn on"}
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
