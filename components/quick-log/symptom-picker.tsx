"use client";

import { useState, useEffect } from "react";
import type { EntryType } from "@/types";

interface SymptomDef {
  id: string;
  name: string;
  category: string;
  isCommon: boolean;
}

interface SymptomPickerProps {
  onSelect: (entryType: EntryType, name: string) => void;
  selectedNames: Set<string>;
  onSeverityChange: (name: string, severity: number) => void;
  severities: Record<string, number>;
}

export function SymptomPicker({
  onSelect,
  selectedNames,
  onSeverityChange,
  severities,
}: SymptomPickerProps) {
  const [symptoms, setSymptoms] = useState<SymptomDef[]>([]);
  const [usual, setUsual] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [res, recentRes] = await Promise.all([
          fetch("/api/symptoms"),
          fetch("/api/entries/recent?days=90&fallback=1"),
        ]);
        if (res.ok) {
          const data = await res.json();
          setSymptoms(data.symptoms ?? []);
        }
        if (recentRes.ok) {
          const data = await recentRes.json();
          const mine: { entryType: string; name: string }[] = data.items ?? [];
          setUsual(mine.filter((i) => i.entryType === "symptom").slice(0, 6).map((i) => i.name));
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return null;

  // Personal history first: the symptoms this person actually logs. Everything
  // else (common ones first) sits behind "More symptoms" so a foggy scan is
  // six chips, not twenty-seven.
  const byName = new Map(symptoms.map((s) => [s.name.toLowerCase(), s]));
  const usualDefs = usual
    .map((n) => byName.get(n.toLowerCase()) ?? { id: `usual-${n}`, name: n, category: "", isCommon: true })
    .filter((s, i, arr) => arr.findIndex((x) => x.name === s.name) === i);
  const usualNames = new Set(usualDefs.map((s) => s.name.toLowerCase()));
  const rest = [...symptoms]
    .filter((s) => !usualNames.has(s.name.toLowerCase()))
    .sort((a, b) => Number(b.isCommon) - Number(a.isCommon));
  const hasUsual = usualDefs.length > 0;
  const sorted = hasUsual ? [...usualDefs, ...(showAll ? rest : [])] : rest;

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-warm-700">
        {hasUsual ? "Your usual" : "Symptoms"}
      </h3>
      <div className="flex flex-wrap gap-2">
        {sorted.map((s) => {
          const key = `symptom:${s.name}`;
          const isSelected = selectedNames.has(key);
          const severity = severities[s.name];

          return (
            <div key={s.id} className="flex items-center gap-1">
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelect("symptom", s.name)}
                className={`flex min-h-11 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  isSelected
                    ? "border-danger/30 bg-danger/10 text-danger-strong"
                    : "border-warm-200 bg-[var(--color-surface-card)] text-warm-700 hover:bg-warm-50"
                }`}
              >
                {s.name}
              </button>
              {isSelected && (
                <select
                  value={severity ?? 5}
                  onChange={(e) =>
                    onSeverityChange(s.name, parseInt(e.target.value, 10))
                  }
                  className="h-11 w-16 rounded-lg border border-warm-200 text-center text-base"
                  aria-label={`${s.name} severity`}
                >
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}/10
                    </option>
                  ))}
                </select>
              )}
            </div>
          );
        })}
      </div>
      {hasUsual && rest.length > 0 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          aria-expanded={showAll}
          className="mt-2 min-h-11 text-sm font-medium text-teal-700 hover:text-teal-800"
        >
          {showAll ? "Fewer symptoms" : `More symptoms (${rest.length})`}
        </button>
      )}
    </div>
  );
}
