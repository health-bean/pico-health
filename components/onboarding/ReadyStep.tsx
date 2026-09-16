"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, NotebookPen, Apple, Frown, Pill } from "lucide-react";
import { Button } from "@/components/ui";

interface ReadyStepProps {
  protocolId?: string;
  onBack: () => void;
}

const EXAMPLE_PROMPTS = [
  { icon: Apple, text: "Salmon and sweet potato for lunch" },
  { icon: Frown, text: "Joint pain about a 6 today" },
  { icon: Pill, text: "Magnesium and vitamin D this morning" },
];

export function ReadyStep({ protocolId, onBack }: ReadyStepProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleComplete() {
    setLoading(true);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          protocolId: protocolId || null,
          loadSampleData: false,
        }),
      });
      router.push("/log");
    } catch {
      router.push("/log");
    }
  }

  return (
    <div className="flex flex-col items-center text-center py-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 mb-6">
        <Sparkles className="h-8 w-8" />
      </div>

      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-text-primary)] mb-2">
        You&apos;re all set
      </h1>

      <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed max-w-xs mb-6">
        Start on the Log tab. Type what you ate or how you feel; one line is enough.
      </p>

      <div className="w-full rounded-2xl bg-[var(--color-surface-card)] p-4 shadow-[var(--shadow-card)] border border-[var(--color-border)]/20 mb-6 text-left">
        <div className="flex items-center gap-2 mb-3">
          <NotebookPen className="h-4 w-4 text-[var(--color-text-muted)]" aria-hidden="true" />
          <span className="text-xs text-[var(--color-text-muted)]">Type it the way you&apos;d say it:</span>
        </div>
        <div className="flex flex-col gap-2">
          {EXAMPLE_PROMPTS.map((prompt) => (
            <div
              key={prompt.text}
              className="flex items-center gap-2.5 text-sm text-[var(--color-text-primary)]"
            >
              <prompt.icon className="h-4 w-4 shrink-0 text-teal-600" aria-hidden="true" />
              <span>&ldquo;{prompt.text}&rdquo;</span>
            </div>
          ))}
        </div>
      </div>

      <Button onClick={handleComplete} loading={loading} size="lg" className="w-full">
        Go to my log
      </Button>

      <button
        type="button"
        onClick={onBack}
        className="mt-2 min-h-11 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
      >
        Back
      </button>
    </div>
  );
}
