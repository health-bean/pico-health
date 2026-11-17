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

/** The 1–10 steps every word uses, matching symptom severity: 1–3, 4–6, 7–10. */
function step(v: number): 0 | 1 | 2 {
  return v >= 7 ? 2 : v >= 4 ? 1 : 0;
}

/**
 * Reflect's scales all have 10 at the good end (stress is "Calm", pain is
 * "None"), so each word reads from bad to good.
 */
const WORDS: Record<"sleep" | "energy" | "mood" | "stress" | "pain", [string, string, string]> = {
  sleep: ["Poor sleep", "OK sleep", "Good sleep"],
  energy: ["Low energy", "Some energy", "Good energy"],
  mood: ["Low mood", "OK mood", "Good mood"],
  stress: ["Stressed", "A bit stressed", "Calm"],
  pain: ["A lot of pain", "Some pain", "Little or no pain"],
};

export interface DaySummary {
  /** How the day felt, in words: "Poor sleep", "Low energy"… */
  felt: string[];
  /** What happened: "Cycle day 10", "Meditated 15 min", "Light activity". */
  did: string[];
}

/**
 * The Log's summary of a day from Reflect, in words rather than "3/10",
 * in a fixed order, only for what the person filled in.
 */
export function daySummary(j: JournalSummaryInput | null | undefined): DaySummary {
  const felt: string[] = [];
  const did: string[] = [];
  if (!j) return { felt, did };
  const word = (key: keyof typeof WORDS, v: number | null | undefined) => {
    if (typeof v === "number") felt.push(WORDS[key][step(v)]);
  };
  word("sleep", j.sleepScore);
  word("energy", j.energyScore);
  word("mood", j.moodScore);
  word("stress", j.stressScore);
  word("pain", j.painScore);
  if (typeof j.cycleDay === "number") did.push(`Cycle day ${j.cycleDay}`);
  if (typeof j.meditationMinutes === "number" && j.meditationMinutes > 0) did.push(`Meditated ${j.meditationMinutes} min`);
  if (j.activityLevel && j.activityLevel !== "none") did.push(`${j.activityLevel[0].toUpperCase()}${j.activityLevel.slice(1)} activity`);
  return { felt, did };
}
