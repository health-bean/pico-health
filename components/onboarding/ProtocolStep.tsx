"use client";
import { useState, useEffect } from "react";
import { Button, Spinner } from "@/components/ui";
import { cn } from "@/lib/utils";

interface Protocol {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface ProtocolStepProps {
  selectedProtocolId?: string;
  onSelect: (protocolId: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function ProtocolStep({ selectedProtocolId, onSelect, onNext, onBack }: ProtocolStepProps) {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/protocols")
      .then((res) => res.json())
      .then((data) => {
        setProtocols(data.protocols || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-text-primary)] mb-1">
        Choose your protocol
      </h1>
      <p className="text-sm text-[var(--color-text-secondary)] mb-6">
        Which healing approach are you following? You can change this anytime.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <div className="flex flex-col gap-2 mb-6 stagger-children">
          {protocols.map((protocol) => (
            <button
              key={protocol.id}
              type="button"
              aria-pressed={selectedProtocolId === protocol.id}
              onClick={() => onSelect(protocol.id)}
              className={cn(
                "w-full text-left rounded-xl p-4",
                "bg-[var(--color-surface-card)] border transition-all duration-200 ease-[var(--ease-out-expo)]",
                "hover:shadow-[var(--shadow-card)]",
                selectedProtocolId === protocol.id
                  ? "border-teal-500 bg-teal-50 shadow-[var(--shadow-card)]"
                  : "border-[var(--color-border)] hover:border-teal-300"
              )}
            >
              <div className="text-sm font-semibold text-[var(--color-text-primary)]">
                {protocol.name}
              </div>
              <div className="text-xs text-[var(--color-text-secondary)] mt-1">
                {protocol.description}
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Button
          onClick={onNext}
          disabled={!selectedProtocolId}
          className="w-full"
        >
          {selectedProtocolId ? "Continue" : "Pick a protocol to continue"}
        </Button>
        <button
          type="button"
          onClick={() => {
            onSelect("");
            onNext();
          }}
          className="min-h-11 text-sm font-medium text-teal-700 hover:text-teal-800 transition-colors"
        >
          Not sure yet? Skip for now
        </button>
        <p className="-mt-1 text-center text-xs text-[var(--color-text-secondary)]">
          You can still log everything. Set a protocol later in Settings.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          Back
        </button>
      </div>
    </div>
  );
}
