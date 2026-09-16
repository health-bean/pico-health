import type { ExtractedEntry, EntryType } from "@/types";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

interface ExtractedCardProps {
  entry: ExtractedEntry;
}

const typeConfig: Record<
  EntryType,
  { label: string; variant: "allowed" | "avoid" | "moderation" | "info" | "default"; bg: string }
> = {
  food: { label: "Food", variant: "allowed", bg: "bg-teal-50 border-teal-200" },
  symptom: { label: "Symptom", variant: "avoid", bg: "bg-danger/10 border-danger/30" },
  supplement: { label: "Supplement", variant: "info", bg: "bg-teal-50 border-teal-200" },
  medication: { label: "Medication", variant: "moderation", bg: "bg-teal-50 border-teal-200" },
  exposure: { label: "Exposure", variant: "moderation", bg: "bg-warning/10 border-warning/30" },
  detox: { label: "Detox", variant: "default", bg: "bg-teal-50 border-teal-200" },
  exercise: { label: "Exercise", variant: "info", bg: "bg-teal-50 border-teal-200" },
  energy: { label: "Energy", variant: "default", bg: "bg-warning/10 border-warning/30" },
  off_protocol: { label: "Off-Protocol", variant: "moderation", bg: "bg-warning/10 border-warning/30" },
};

export function ExtractedCard({ entry }: ExtractedCardProps) {
  const config = typeConfig[entry.entryType] ?? typeConfig.food;

  // Special rendering for exercise entries
  if (entry.entryType === "exercise" && entry.details) {
    const duration = entry.details.duration_minutes as number | undefined;
    const intensity = entry.details.intensity_level as string | undefined;
    const energyBefore = entry.details.energy_before as number | undefined;

    return (
      <div
        className={cn(
          "flex flex-col gap-1.5 rounded-xl border px-3 py-2",
          config.bg
        )}
      >
        <div className="flex items-center gap-2">
          <Badge variant={config.variant}>{config.label}</Badge>
          <span className="text-sm font-medium text-warm-800">{entry.name}</span>
        </div>
        
        <div className="flex items-center gap-3 text-xs text-warm-600">
          {duration && (
            <span className="flex items-center gap-1">
              <span className="font-medium">Duration:</span> {duration} min
            </span>
          )}
          {intensity && (
            <span className="flex items-center gap-1">
              <span className="font-medium">Intensity:</span> {intensity}
            </span>
          )}
          {energyBefore !== undefined && (
            <span className="flex items-center gap-1">
              <span className="font-medium">Energy before:</span> {energyBefore}/10
            </span>
          )}
        </div>
      </div>
    );
  }

  // Special rendering for energy entries
  if (entry.entryType === "energy" && entry.details) {
    const energyLevel = entry.details.energyLevel as number | undefined;

    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border px-3 py-2",
          config.bg
        )}
      >
        <Badge variant={config.variant}>{config.label}</Badge>
        <span className="text-sm font-medium text-warm-800">{entry.name}</span>
        {energyLevel !== undefined && (
          <span className="ml-auto text-sm font-semibold text-warm-700">
            {energyLevel}/10
          </span>
        )}
      </div>
    );
  }

  // Default rendering for other entry types
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border px-3 py-2",
        config.bg
      )}
    >
      <Badge variant={config.variant}>{config.label}</Badge>

      <span className="text-sm font-medium text-warm-800">{entry.name}</span>

      {entry.severity != null && (
        <span className="ml-auto text-xs text-warm-500">
          {entry.severity}/10
        </span>
      )}

      {entry.details &&
        Object.entries(entry.details).map(([key, val]) => (
          <span key={key} className="text-xs text-warm-500">
            {String(val)}
          </span>
        ))}
    </div>
  );
}
