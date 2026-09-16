"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui";
import { ScoreSlider } from "./score-slider";
import type { JournalScores } from "@/types";

interface JournalCheckInProps {
  onSave: (scores: JournalScores) => Promise<void>;
  onDismiss: () => void;
}

export function JournalCheckIn({ onSave, onDismiss }: JournalCheckInProps) {
  const [scores, setScores] = useState<JournalScores>({});
  const [saving, setSaving] = useState(false);

  function setScore(key: keyof JournalScores, value: number) {
    setScores((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(scores);
    } finally {
      setSaving(false);
    }
  }

  const hasScores = Object.values(scores).some(
    (v) => v !== undefined && typeof v === "number"
  );

  return (
    <div className="mx-auto w-full max-w-2xl rounded-xl border border-warm-200 bg-[var(--color-surface-card)] p-4 shadow-[var(--shadow-card)]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-warm-900">
          Daily check-in
        </h3>
        <button
          onClick={onDismiss}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-warm-500 hover:bg-warm-100 hover:text-warm-600"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="mb-4 text-xs text-warm-500">
        How are you feeling today? Slide to rate each area.
      </p>

      <div className="flex flex-col gap-3">
        <ScoreSlider
          label="Sleep"
          value={scores.sleepScore ?? null}
          onChange={(v) => setScore("sleepScore", v)}
        />
        <ScoreSlider
          label="Energy"
          value={scores.energyScore ?? null}
          onChange={(v) => setScore("energyScore", v)}
        />
        <ScoreSlider
          label="Mood"
          value={scores.moodScore ?? null}
          onChange={(v) => setScore("moodScore", v)}
        />
        <ScoreSlider
          label="Stress"
          value={scores.stressScore ?? null}
          onChange={(v) => setScore("stressScore", v)}
        />
        <ScoreSlider
          label="Pain"
          value={scores.painScore ?? null}
          onChange={(v) => setScore("painScore", v)}
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button
          onClick={handleSave}
          loading={saving}
          disabled={!hasScores}
          size="sm"
        >
          Save Check-in
        </Button>
        <button
          onClick={onDismiss}
          className="text-sm text-warm-500 hover:text-warm-700"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
