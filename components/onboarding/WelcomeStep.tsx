"use client";
import { Leaf } from "lucide-react";
import { Button } from "@/components/ui";

interface WelcomeStepProps {
  onNext: () => void;
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="flex flex-col items-center text-center py-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 mb-6">
        <Leaf className="h-8 w-8" />
      </div>

      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-text-primary)] mb-2">
        Welcome to <span className="text-teal-800">Pico Health</span>
      </h1>

      <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed max-w-xs mb-8">
        Your intelligent protocol coach. Track food, symptoms, and lifestyle
        through simple conversation — and discover the patterns that matter.
      </p>

      <Button onClick={onNext} size="lg" className="w-full">
        Let&apos;s Get Started
      </Button>
    </div>
  );
}
