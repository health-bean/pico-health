import { Badge } from "@/components/ui";
import { BAND_LABELS, type RatingResult } from "@/lib/food-data/compute";
import { LEVEL_LABELS, levelVariant } from "@/lib/food-data/labels";

/** A food rating, e.g. "High · Very high" (level · fine-grained band). */
export function RatingBadge({ result }: { result: Pick<RatingResult, "level" | "band"> }) {
  if (!result.level) return <Badge>Unknown</Badge>;
  return (
    <Badge variant={levelVariant(result.level)}>
      {LEVEL_LABELS[result.level]}
      {result.band ? ` · ${BAND_LABELS[result.band]}` : ""}
    </Badge>
  );
}
