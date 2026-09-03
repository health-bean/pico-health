import type {
  DayComposite, FoodEntry, SymptomEntry, SupplementEntry,
  MedicationEntry, ExposureEntry, ExerciseEntry, FoodProperty, JournalScores,
} from './types';

interface RawEntry {
  entryType: string;
  name: string;
  severity: number | null;
  entryTime: string | null;
  foodId: string | null;
  mealType: string | null;
  portion: string | null;
  exerciseType: string | null;
  durationMinutes: number | null;
  intensityLevel: string | null;
  energyLevel: number | null;
  structuredContent?: Record<string, unknown> | null;
}

interface RawJournal {
  sleepScore: number | null;
  energyScore: number | null;
  moodScore: number | null;
  stressScore: number | null;
  painScore: number | null;
}

interface ProtocolContext {
  protocolId: string;
  checkCompliance: (foodId: string | null, properties: FoodProperty[]) => { status: string; violations: string[] };
}

function extractPreparation(structuredContent: Record<string, unknown> | null | undefined): string[] {
  const raw = structuredContent?.preparation;
  if (!Array.isArray(raw)) return [];
  return raw.filter((p): p is string => typeof p === 'string');
}

export function isFlareDay(symptoms: SymptomEntry[]): boolean {
  if (symptoms.length >= 2) return true;
  return symptoms.some(s => s.severity >= 7);
}

export function hasLateMeal(foods: FoodEntry[]): boolean {
  return foods.some(f => {
    if (!f.time) return false;
    const hour = parseInt(f.time.split(':')[0], 10);
    return hour >= 20;
  });
}

export function buildDayComposite(
  userId: string,
  date: string,
  entries: RawEntry[],
  journal: RawJournal | null,
  foodProperties: Map<string, FoodProperty[]>,
  protocolContext: ProtocolContext | null,
): DayComposite {
  const foods: FoodEntry[] = [];
  const symptoms: SymptomEntry[] = [];
  const supplements: SupplementEntry[] = [];
  const medications: MedicationEntry[] = [];
  const exposures: ExposureEntry[] = [];
  const exercises: ExerciseEntry[] = [];
  let violationCount = 0;
  let compliantCount = 0;
  let totalProtocolFoods = 0;

  for (const entry of entries) {
    switch (entry.entryType) {
      case 'food':
      case 'off_protocol': {
        const props = entry.foodId ? (foodProperties.get(entry.foodId) ?? []) : [];
        let protocolStatus: FoodEntry['protocolStatus'] = null;
        if (protocolContext && entry.entryType === 'food') {
          const result = protocolContext.checkCompliance(entry.foodId, props);
          protocolStatus = result.status as FoodEntry['protocolStatus'];
          if (result.status === 'avoid') violationCount++;
          if (result.status === 'allowed') compliantCount++;
          totalProtocolFoods++;
        }
        foods.push({
          foodId: entry.foodId,
          name: entry.name,
          properties: props,
          mealType: entry.mealType,
          time: entry.entryTime,
          protocolStatus,
          preparation: extractPreparation(entry.structuredContent),
        });
        break;
      }
      case 'symptom':
        symptoms.push({ name: entry.name, severity: entry.severity ?? 0, time: entry.entryTime });
        break;
      case 'supplement':
        supplements.push({ name: entry.name, time: entry.entryTime });
        break;
      case 'medication':
        medications.push({ name: entry.name, time: entry.entryTime });
        break;
      case 'exposure':
        exposures.push({ type: entry.name, severity: entry.severity, time: entry.entryTime });
        break;
      case 'exercise':
        exercises.push({
          type: entry.exerciseType ?? entry.name,
          intensity: entry.intensityLevel ?? 'moderate',
          duration: entry.durationMinutes ?? 0,
          energyLevel: entry.energyLevel,
          time: entry.entryTime,
        });
        break;
    }
  }

  const journalScores: JournalScores = {
    sleep: journal?.sleepScore ?? null,
    energy: journal?.energyScore ?? null,
    mood: journal?.moodScore ?? null,
    stress: journal?.stressScore ?? null,
    pain: journal?.painScore ?? null,
  };

  const compliancePct = totalProtocolFoods > 0
    ? Math.round((compliantCount / totalProtocolFoods) * 10000) / 100
    : null;

  return {
    userId,
    date,
    foods,
    symptoms,
    supplements,
    medications,
    exposures,
    exercises,
    journal: journalScores,
    foodCount: foods.length,
    symptomCount: symptoms.length,
    supplementCount: supplements.length,
    medicationCount: medications.length,
    exposureCount: exposures.length,
    exerciseCount: exercises.length,
    protocolId: protocolContext?.protocolId ?? null,
    compliancePct,
    violationCount,
    entryCount: entries.length,
    hasJournal: journal !== null,
    isFlareDay: isFlareDay(symptoms),
    hasLateMeal: hasLateMeal(foods),
  };
}
