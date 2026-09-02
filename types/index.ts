export type EntryType = "food" | "symptom" | "supplement" | "medication" | "exposure" | "detox" | "exercise" | "energy" | "off_protocol";

export type ProtocolStatus = "allowed" | "avoid" | "moderation" | "reintroduction" | "unknown";

export type TriggerLevel = "none" | "low" | "moderate" | "high" | "very_high" | "unknown";

export type ExerciseType =
  | "walking"
  | "running"
  | "cycling"
  | "swimming"
  | "yoga"
  | "strength_training"
  | "stretching"
  | "sports"
  | "other";

export type IntensityLevel = "light" | "moderate" | "vigorous";

export type OnboardingStep = 
  | "welcome" 
  | "profile" 
  | "protocol" 
  | "tutorial" 
  | "sample_data" 
  | "complete";

export type HealthGoal = 
  | "reduce_symptoms" 
  | "identify_triggers" 
  | "track_progress" 
  | "reintroduce_foods" 
  | "optimize_energy" 
  | "manage_medication";

export type ReintroductionPhase = "testing" | "observation" | "complete";

export type ReintroductionStatus = 
  | "active" 
  | "passed" 
  | "failed" 
  | "inconclusive" 
  | "cancelled";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName?: string | null;
  currentProtocolId: string | null;
  onboardingCompleted?: boolean;
  onboardingStep?: OnboardingStep;
  healthGoals?: string[];
}

export interface SessionData {
  userId: string;
  email: string;
  firstName: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  extractedData: ExtractedEntry[] | null;
  createdAt: string;
}

export interface ExtractedEntry {
  /** Timeline entry id once persisted (present for entries saved from chat). */
  id?: string;
  entryType: EntryType;
  name: string;
  severity?: number;
  details?: Record<string, unknown>;
}

export interface TimelineEntry {
  id: string;
  userId: string;
  sourceMessageId: string | null;
  entryType: EntryType;
  name: string;
  severity: number | null;
  structuredContent: Record<string, unknown> | null;
  entryDate: string;
  entryTime: string | null;
  createdAt: string;
  exerciseType?: string | null;
  durationMinutes?: number | null;
  intensityLevel?: string | null;
  energyLevel?: number | null;
  isSample?: boolean;
  // Food-specific fields
  foodId?: string | null;
  portion?: string | null;
  mealType?: string | null;
  food?: {
    displayName: string;
    category: string | null;
    subcategory: string | null;
    properties: Record<string, unknown> | null;
    isCustom: boolean;
  };
  protocolViolations?: string[];
}

export interface ExerciseEntry extends TimelineEntry {
  entryType: "exercise";
  exerciseType: ExerciseType;
  durationMinutes: number;
  intensityLevel: IntensityLevel;
  energyLevel?: number;
}

export interface JournalEntry {
  id: string;
  userId: string;
  entryDate: string;
  sleepScore: number | null;
  energyScore: number | null;
  moodScore: number | null;
  stressScore: number | null;
  painScore: number | null;
  notes?: string | null;
  isSample?: boolean;
}

export interface JournalScores {
  sleepScore?: number;
  energyScore?: number;
  moodScore?: number;
  stressScore?: number;
  painScore?: number;
  notes?: string;
}

export interface Protocol {
  id: string;
  name: string;
  description: string;
  category: string;
  durationWeeks: number | null;
  hasPhases: boolean;
}

export type CorrelationType =
  | "food-symptom"
  | "food-property-pattern"
  | "supplement-effect"
  | "medication-effect"
  | "sleep-supplement"
  | "stress-symptom"
  | "meal-timing"
  | "exercise-energy";

export interface Insight {
  id: string;
  type: CorrelationType;
  trigger: string;
  effect: string;
  confidence: number;
  percentage: number;
  occurrences: number;
  opportunities: number;
  timeframe: string;
  description: string;
  recommendation: string;
  impactScore: number;
  contributingFoods?: string[];
  propertyType?: string;
  foodCount?: number;
}

export interface InsightSummary {
  total: number;
  foodTriggers: number;
  foodPatterns: number;
  supplementEffects: number;
  medicationEffects: number;
  stressAmplifiers: number;
  sleepFactors: number;
  mealTimingFactors: number;
}

export interface InsightResult {
  triggers: Insight[];
  helpers: Insight[];
  trends: Insight[];
  summary: InsightSummary;
}

/** @deprecated Use Insight instead */
export interface Correlation {
  id: string;
  type: string;
  triggerName: string;
  symptomName: string;
  confidence: number;
  impact: number;
  occurrences: number;
  description: string;
}

export interface ProtocolPhase {
  id: string;
  protocolId: string;
  name: string;
  slug: string;
  phaseOrder: number;
  durationWeeks: number | null;
  description: string | null;
  guidance: string | null;
}

export interface UserProtocolState {
  id: string;
  userId: string;
  protocolId: string;
  currentPhaseId: string | null;
  phaseStartDate: string;
  expectedEndDate: string | null;
  startedAt: string;
  updatedAt: string;
  // Joined data
  protocolName?: string;
  phaseName?: string;
  phaseOrder?: number;
  totalPhases?: number;
  phaseGuidance?: string;
}

export interface ReintroductionTrial {
  id: string;
  userId: string;
  protocolId: string;
  foodId: string | null;
  foodName: string;
  startDate: string;
  endDate: string | null;
  status: ReintroductionStatus;
  outcome: string | null;
  symptomsSummary: Record<string, unknown> | null;
  currentPhase?: ReintroductionPhase;
  currentDay?: number;
  lastLogDate?: string | null;
  missedDays?: number;
  analysisDate?: string | null;
  analysisNotes?: string | null;
  cancellationDate?: string | null;
  cancellationReason?: string | null;
}

export interface Food {
  id: string;
  displayName: string;
  categoryName: string;
  subcategoryName: string;
  protocolStatus?: ProtocolStatus;
  triggerProperties: {
    nightshade: boolean;
    histamine: TriggerLevel;
    oxalate: TriggerLevel;
    lectin: TriggerLevel;
    fodmap: TriggerLevel;
    salicylate: TriggerLevel;
  };
}

export interface ChatStreamEvent {
  type: "text" | "extracted" | "done" | "error";
  content?: string;
  entries?: ExtractedEntry[];
  error?: string;
}

export interface CustomFood {
  id: string;
  userId: string;
  displayName: string;
  category: string | null;
  subcategory: string | null;
  isArchived: boolean;
  properties?: FoodTriggerProperties;
  createdAt?: string;
  updatedAt?: string;
}

export interface FoodTriggerProperties {
  nightshade: boolean;
  histamine: TriggerLevel;
  oxalate: TriggerLevel;
  lectin: TriggerLevel;
  fodmap: TriggerLevel;
  salicylate: TriggerLevel;
  amines?: TriggerLevel;
  glutamates?: TriggerLevel;
  sulfites?: TriggerLevel;
  goitrogens?: TriggerLevel;
  purines?: TriggerLevel;
  phytoestrogens?: TriggerLevel;
  phytates?: TriggerLevel;
  tyramine?: TriggerLevel;
}

export interface ExerciseInsight {
  exerciseType: ExerciseType;
  avgEnergyChange: number;
  correlationStrength: number;
  sampleSize: number;
  isPositive: boolean;
  energyBefore: number[];
  energyAfter: number[];
}

export interface ReintroductionRecommendation {
  foodId: string;
  foodName: string;
  reason: string;
  symptomFreeDays: number;
  lastLoggedDate: string | null;
  priority: number;
}
