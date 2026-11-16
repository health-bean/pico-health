/** The journal fields the Log's one-line day summary can show. */
export interface JournalSummaryInput {
  sleepScore?: number | null;
  energyScore?: number | null;
  moodScore?: number | null;
  stressScore?: number | null;
  painScore?: number | null;
  cycleDay?: number | null;
  meditationMinutes?: number | null;
  activityLevel?: string | null;
}

/**
 * Short parts like "Sleep 6/10" or "Cycle day 22", in a fixed order, only
 * for what the person filled in. Stress and pain use Reflect's own scale,
 * where 10 is the good end ("Calm", "None"), so they're labelled that way.
 */
export function daySummaryParts(j: JournalSummaryInput | null | undefined): string[] {
  if (!j) return [];
  const parts: string[] = [];
  const score = (label: string, v: number | null | undefined) => {
    if (typeof v === "number") parts.push(`${label} ${v}/10`);
  };
  score("Sleep", j.sleepScore);
  score("Energy", j.energyScore);
  score("Mood", j.moodScore);
  score("Calm", j.stressScore);
  score("Pain-free", j.painScore);
  if (typeof j.cycleDay === "number") parts.push(`Cycle day ${j.cycleDay}`);
  if (typeof j.meditationMinutes === "number" && j.meditationMinutes > 0) parts.push(`Meditated ${j.meditationMinutes} min`);
  if (j.activityLevel && j.activityLevel !== "none") parts.push(`${j.activityLevel[0].toUpperCase()}${j.activityLevel.slice(1)} activity`);
  return parts;
}
