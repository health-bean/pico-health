"use client";

import { useState, useEffect } from "react";
import { Frown } from "lucide-react";
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/symptoms");
        if (res.ok) {
          const data = await res.json();
          setSymptoms(data.symptoms ?? []);
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

  // Show common symptoms first
  const sorted = [...symptoms].sort((a, b) => {
    if (a.isCommon && !b.isCommon) return -1;
    if (!a.isCommon && b.isCommon) return 1;
    return 0;
  });

  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-warm-400">
        Symptoms
      </h3>
      <div className="flex flex-wrap gap-2">
        {sorted.map((s) => {
          const key = `symptom:${s.name}`;
          const isSelected = selectedNames.has(key);
          const severity = severities[s.name];

          return (
            <div key={s.id} className="flex items-center gap-1">
              <button
                onClick={() => onSelect("symptom", s.name)}
                className={`flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  isSelected
                    ? "border-red-300 bg-red-50 text-red-700"
                    : "border-warm-200 bg-[var(--color-surface-card)] text-warm-700 hover:bg-warm-50"
                }`}
              >
                <Frown className="h-3.5 w-3.5" />
                {s.name}
              </button>
              {isSelected && (
                <select
                  value={severity ?? 5}
                  onChange={(e) =>
                    onSeverityChange(s.name, parseInt(e.target.value, 10))
                  }
                  className="h-8 w-14 rounded-md border border-warm-200 text-center text-xs"
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
    </div>
  );
}
