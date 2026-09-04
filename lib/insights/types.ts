// --- Day Composite ---

export interface FoodEntry {
  foodId: string | null;
  name: string;
  properties: FoodProperty[];
  mealType: string | null;
  time: string | null;
  protocolStatus: 'allowed' | 'avoid' | 'moderation' | 'reintroduction' | 'unknown' | null;
  /** Preparation states, e.g. ['leftover', 'fermented']. Optional: absent on rows persisted before this field existed. */
  preparation?: string[];
  /** Coarse dose from a clarifier: 'less' | 'usual' | 'more'. */
  quantity?: string;
  /** Additions from a clarifier, e.g. ['garlic', 'paprika_chili']. */
  additions?: string[];
}

export interface FoodProperty {
  property: string;
  severity: string;
}

export interface SymptomEntry {
  name: string;
  severity: number;
  time: string | null;
}

export interface SupplementEntry {
  name: string;
  time: string | null;
}

export interface MedicationEntry {
  name: string;
  time: string | null;
}

export interface ExposureEntry {
  type: string;
  severity: number | null;
  time: string | null;
}

export interface ExerciseEntry {
  type: string;
  intensity: string;
  duration: number;
  energyLevel: number | null;
  time: string | null;
}

export interface JournalScores {
  sleep: number | null;
  energy: number | null;
  mood: number | null;
  stress: number | null;
  pain: number | null;
}

export interface DayComposite {
  userId: string;
  date: string;
  foods: FoodEntry[];
  symptoms: SymptomEntry[];
  supplements: SupplementEntry[];
  medications: MedicationEntry[];
  exposures: ExposureEntry[];
  exercises: ExerciseEntry[];
  journal: JournalScores;
  foodCount: number;
  symptomCount: number;
  supplementCount: number;
  medicationCount: number;
  exposureCount: number;
  exerciseCount: number;
  protocolId: string | null;
  compliancePct: number | null;
  violationCount: number;
  entryCount: number;
  hasJournal: boolean;
  isFlareDay: boolean;
  hasLateMeal: boolean;
}

// --- Factors ---

export type FactorCategory =
  | 'food' | 'food_property' | 'preparation' | 'quantity' | 'addition' | 'supplement' | 'medication'
  | 'exposure' | 'exercise' | 'sleep' | 'stress' | 'energy'
  | 'mood' | 'pain' | 'timing' | 'compliance';

export interface Factor {
  category: FactorCategory;
  key: string;
  label: string;
}

export type OutcomeType =
  | 'symptom_occurrence' | 'symptom_severity'
  | 'next_day_sleep' | 'next_day_energy' | 'next_day_mood' | 'next_day_pain'
  | 'flare_day';

export interface Outcome {
  type: OutcomeType;
  key: string;
  label: string;
}

// --- Correlations ---

/**
 * Which way the factor moves the outcome. `increases` → a trigger;
 * `decreases` → a helper. Decided by the numbers, never by the factor's category.
 */
export type Direction = 'increases' | 'decreases';

/** How much evidence sits behind a result. Shown to the user; drives ranking. */
export type Confidence = 'early' | 'moderate' | 'strong';

export interface SingleFactorResult {
  factor: Factor;
  outcome: Outcome;
  /** Days with both the factor and the outcome. */
  frequency: number;
  /** Days with the factor. */
  totalOpportunities: number;
  /** Outcome rate on days WITHOUT the factor (raw, unsmoothed). */
  baseRate: number;
  /** Outcome rate on days WITH the factor (raw, unsmoothed). */
  conditionalRate: number;
  /** Smoothed conditional/base ratio, capped. <1 means protective. */
  rateMultiplier: number;
  recencyDays: number;
  impactScore: number;
  direction: Direction;
  confidence: Confidence;
  description: string;
}

export interface MultiFactorResult {
  factors: Factor[];
  factorCount: number;
  outcome: Outcome;
  frequency: number;
  coOccurrences: number;
  conditionalRate: number;
  bestSubRate: number;
  direction: Direction;
  confidence: Confidence;
  rateMultiplier: number;
  recencyDays: number;
  impactScore: number;
  description: string;
  absorbed: string[];
}

export interface PropertyPattern {
  property: string;
  severity: string;
  foods: string[];
  outcome: Outcome;
  frequency: number;
  impactScore: number;
  description: string;
}

export interface ProgressObservation {
  metric: string;
  label: string;
  currentPeriod: { count: number; days: number; label: string };
  previousPeriod: { count: number; days: number; label: string };
  observation: string;
}

// --- Engine Output ---

export interface InsightsOutput {
  triggers: (SingleFactorResult | MultiFactorResult)[];
  helpers: (SingleFactorResult | MultiFactorResult)[];
  propertyPatterns: PropertyPattern[];
  progress: ProgressObservation[];
  dataStatus: {
    daysTracked: number;
    daysAnalyzed: number;
    loggingConsistency: number;
    singleFactors: number;
    twoFactorPatterns: number;
    threeFactorPatterns: number;
  };
}

// --- Alerts ---

export type AlertType = 'new_pattern' | 'pattern_strengthened' | 'recurrence' | 'progress_milestone';

export interface InsightAlert {
  id: string;
  alertType: AlertType;
  insightKey: string;
  title: string;
  body: string;
  detail: Record<string, unknown>;
  dismissed: boolean;
  createdAt: string;
  dismissedAt: string | null;
}

// --- Helpers ---

export function insightKey(factors: Factor[], outcome: Outcome): string {
  const fKeys = factors.map(f => f.key).sort().join('+');
  return `${fKeys}→${outcome.key}`;
}

export function bucketScore(score: number | null): 'poor' | 'moderate' | 'good' | null {
  if (score === null) return null;
  if (score <= 4) return 'poor';
  if (score <= 6) return 'moderate';
  return 'good';
}

export function bucketNegativeScore(score: number | null): 'low' | 'moderate' | 'high' | null {
  if (score === null) return null;
  if (score <= 4) return 'low';
  if (score <= 6) return 'moderate';
  return 'high';
}
