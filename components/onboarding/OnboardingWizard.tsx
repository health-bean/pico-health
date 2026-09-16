"use client";
import { useState } from "react";
import { WelcomeStep } from "./WelcomeStep";
import { ProtocolStep } from "./ProtocolStep";
import { ReadyStep } from "./ReadyStep";
import { cn } from "@/lib/utils";

type Step = "welcome" | "protocol" | "ready";
const STEPS: Step[] = ["welcome", "protocol", "ready"];

function ProgressDots({ current }: { current: Step }) {
  const currentIdx = STEPS.indexOf(current);
  return (
    <div className="flex items-center justify-center gap-2 py-6" role="img" aria-label={`Step ${currentIdx + 1} of ${STEPS.length}`}>
      {STEPS.map((step, i) => (
        <div
          key={step}
          className={cn(
            "h-2 rounded-full transition-all duration-300 ease-[var(--ease-out-expo)]",
            i === currentIdx ? "w-6 bg-teal-500" : i < currentIdx ? "w-2 bg-teal-200" : "w-2 bg-warm-200"
          )}
        />
      ))}
    </div>
  );
}

interface OnboardingData {
  protocolId?: string;
}

export function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState<Step>("welcome");
  const [data, setData] = useState<OnboardingData>({});

  const nextStep = () => {
    const idx = STEPS.indexOf(currentStep);
    if (idx < STEPS.length - 1) setCurrentStep(STEPS[idx + 1]);
  };

  const prevStep = () => {
    const idx = STEPS.indexOf(currentStep);
    if (idx > 0) setCurrentStep(STEPS[idx - 1]);
  };

  return (
    <div className="animate-fade-in-up">
      <ProgressDots current={currentStep} />
      {currentStep === "welcome" && <WelcomeStep onNext={nextStep} />}
      {currentStep === "protocol" && (
        <ProtocolStep
          selectedProtocolId={data.protocolId}
          onSelect={(id) => setData((prev) => ({ ...prev, protocolId: id }))}
          onNext={nextStep}
          onBack={prevStep}
        />
      )}
      {currentStep === "ready" && (
        <ReadyStep protocolId={data.protocolId} onBack={prevStep} />
      )}
    </div>
  );
}
