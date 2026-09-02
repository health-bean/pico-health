import { db } from "@/lib/db";
import {
  timelineEntries,
  journalEntries,
  foods,
  foodCategories,
  foodSubcategories,
  profiles,
  userProtocolState,
} from "@/lib/db/schema";
import { eq, ilike, and, sql } from "drizzle-orm";
import { checkFoodCompliance } from "@/lib/protocols/compliance";

/** Escape SQL LIKE wildcards in user input */
function escapeLikeWildcards(str: string): string {
  return str.replace(/[%_]/g, "\\$&");
}

/**
 * Minimum pg_trgm similarity for a fuzzy food match to be considered
 * "clearly good". Matches the threshold used by
 * lib/db/queries/foods.ts::searchFoods.
 */
const FOOD_MATCH_SIMILARITY = 0.3;

interface LogEntry {
  entry_type: "food" | "symptom" | "supplement" | "medication" | "detox" | "exposure";
  name: string;
  severity?: number;
  details?: string;
  entry_date?: string;
  entry_time?: string;
  meal_type?: "breakfast" | "lunch" | "dinner" | "snack";
  portion?: string;
}

interface LogEntriesInput {
  entries: LogEntry[];
}

interface SearchFoodsInput {
  query: string;
  check_protocol?: boolean;
}

interface JournalScoresInput {
  sleep_score?: number;
  energy_score?: number;
  mood_score?: number;
  stress_score?: number;
  pain_score?: number;
  notes?: string;
  entry_date?: string;
}

interface LogExerciseInput {
  exercise_type: "walking" | "running" | "cycling" | "swimming" | "yoga" | "strength_training" | "stretching" | "sports" | "other";
  duration_minutes: number;
  intensity_level: "light" | "moderate" | "vigorous";
  energy_before?: number;
  energy_after?: number;
  notes?: string;
}

export interface CreatedEntry {
  id: string;
  entryType: string;
  name: string;
  severity: number | null;
  details: Record<string, unknown> | string | null;
  entryDate: string;
  entryTime: string | null;
  mealType: string | null;
  foodId: string | null;
  protocolViolations: string[];
}

export async function processToolCall(
  toolName: string,
  toolInput: unknown,
  userId: string,
  messageId: string | null
): Promise<{ result: unknown; entries?: CreatedEntry[] }> {
  switch (toolName) {
    case "log_entries":
      return handleLogEntries(toolInput as LogEntriesInput, userId, messageId);
    case "search_foods":
      return handleSearchFoods(toolInput as SearchFoodsInput, userId);
    case "log_journal_scores":
      return handleLogJournalScores(toolInput as JournalScoresInput, userId);
    case "log_exercise":
      return handleLogExercise(toolInput as LogExerciseInput, userId, messageId);
    default:
      return { result: { error: `Unknown tool: ${toolName}` } };
  }
}

/**
 * Find a matching food in the local curated database.
 * Exact (case-insensitive) match first, then a pg_trgm fuzzy match —
 * top hit only, and only when clearly good. Never calls USDA.
 */
async function matchFood(
  name: string
): Promise<{ id: string; displayName: string } | null> {
  const [exact] = await db
    .select({ id: foods.id, displayName: foods.displayName })
    .from(foods)
    .where(sql`LOWER(${foods.displayName}) = LOWER(${name})`)
    .limit(1);

  if (exact) return exact;

  try {
    const [fuzzy] = await db
      .select({ id: foods.id, displayName: foods.displayName })
      .from(foods)
      .where(sql`similarity(${foods.displayName}, ${name}) > ${FOOD_MATCH_SIMILARITY}`)
      .orderBy(sql`similarity(${foods.displayName}, ${name}) DESC`)
      .limit(1);

    return fuzzy ?? null;
  } catch {
    // pg_trgm unavailable or query failed — no fuzzy match.
    return null;
  }
}

/**
 * Load the user's active protocol + current phase (once per tool call).
 * Returns null when the user has no active protocol or loading fails.
 */
async function loadProtocolState(
  userId: string
): Promise<{ protocolId: string; phaseId: string | null } | null> {
  try {
    const [user] = await db
      .select({ currentProtocolId: profiles.currentProtocolId })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1);

    if (!user?.currentProtocolId) return null;

    let phaseId: string | null = null;
    try {
      const [state] = await db
        .select({ currentPhaseId: userProtocolState.currentPhaseId })
        .from(userProtocolState)
        .where(
          and(
            eq(userProtocolState.userId, userId),
            eq(userProtocolState.protocolId, user.currentProtocolId)
          )
        )
        .limit(1);
      phaseId = state?.currentPhaseId ?? null;
    } catch {
      phaseId = null;
    }

    return { protocolId: user.currentProtocolId, phaseId };
  } catch {
    return null;
  }
}

async function handleLogEntries(
  input: LogEntriesInput,
  userId: string,
  messageId: string | null
): Promise<{ result: unknown; entries: CreatedEntry[] }> {
  const today = new Date().toISOString().split("T")[0];
  const created: CreatedEntry[] = [];

  // Lazily loaded once per call; undefined = not loaded yet.
  let protocolState:
    | { protocolId: string; phaseId: string | null }
    | null
    | undefined;

  for (const entry of input.entries) {
    const entryDate = entry.entry_date || today;
    const entryTime = entry.entry_time || null;
    const isFood = entry.entry_type === "food";
    const mealType = isFood ? entry.meal_type ?? null : null;
    const portion = isFood ? entry.portion ?? null : null;

    const structuredContent: Record<string, unknown> = {};
    if (entry.details) {
      structuredContent.details = entry.details;
    }
    if (entry.severity !== undefined) {
      structuredContent.severity = entry.severity;
    }

    // For food entries, try to find matching food in database
    let foodId: string | null = null;
    if (isFood) {
      const matchedFood = await matchFood(entry.name);
      if (matchedFood) {
        foodId = matchedFood.id;
        // Use the canonical display name from database
        entry.name = matchedFood.displayName;
      }
    }

    // Protocol compliance — only for matched foods with an active protocol.
    let protocolViolations: string[] = [];
    if (foodId) {
      try {
        if (protocolState === undefined) {
          protocolState = await loadProtocolState(userId);
        }
        if (protocolState) {
          const compliance = await checkFoodCompliance(
            foodId,
            protocolState.protocolId,
            protocolState.phaseId
          );
          protocolViolations = compliance.violations ?? [];
        }
      } catch {
        protocolViolations = [];
      }
    }

    const [inserted] = await db
      .insert(timelineEntries)
      .values({
        userId,
        sourceMessageId: messageId,
        entryType: entry.entry_type,
        name: entry.name,
        severity: entry.severity ?? null,
        foodId: foodId,
        mealType: mealType,
        portion: portion,
        structuredContent:
          Object.keys(structuredContent).length > 0 ? structuredContent : null,
        entryDate: entryDate,
        entryTime: entryTime,
      })
      .returning({
        id: timelineEntries.id,
        entryType: timelineEntries.entryType,
        name: timelineEntries.name,
        severity: timelineEntries.severity,
        entryDate: timelineEntries.entryDate,
        entryTime: timelineEntries.entryTime,
        mealType: timelineEntries.mealType,
      });

    created.push({
      id: inserted.id,
      entryType: inserted.entryType,
      name: inserted.name,
      severity: inserted.severity,
      details: entry.details || null,
      entryDate: inserted.entryDate,
      entryTime: inserted.entryTime,
      mealType: inserted.mealType ?? null,
      foodId: foodId,
      protocolViolations,
    });
  }

  return {
    result: {
      success: true,
      message: `Logged ${created.length} ${created.length === 1 ? "entry" : "entries"}`,
      entries: created,
    },
    entries: created,
  };
}

async function handleSearchFoods(
  input: SearchFoodsInput,
  userId: string
): Promise<{ result: unknown }> {
  // Search for matching foods
  const matchingFoods = await db
    .select({
      id: foods.id,
      displayName: foods.displayName,
      categoryName: foodCategories.name,
      subcategoryName: foodSubcategories.name,
      isCommon: foods.isCommon,
    })
    .from(foods)
    .innerJoin(foodSubcategories, eq(foods.subcategoryId, foodSubcategories.id))
    .innerJoin(
      foodCategories,
      eq(foodSubcategories.categoryId, foodCategories.id)
    )
    .where(ilike(foods.displayName, `%${escapeLikeWildcards(input.query)}%`))
    .limit(10);

  if (matchingFoods.length === 0) {
    return {
      result: {
        found: false,
        message: `No foods matching "${input.query}" found in the database.`,
      },
    };
  }

  // If protocol check requested, get user's protocol and check compliance
  let protocolInfo: {
    protocolName: string;
    compliance: Record<string, string>;
  } | null = null;

  if (input.check_protocol) {
    const [user] = await db
      .select({
        currentProtocolId: profiles.currentProtocolId,
      })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1);

    if (user?.currentProtocolId) {
      // Get current phase for phase-aware compliance
      let phaseId: string | null = null;
      try {
        const [state] = await db
          .select({ currentPhaseId: userProtocolState.currentPhaseId })
          .from(userProtocolState)
          .where(
            and(
              eq(userProtocolState.userId, userId),
              eq(userProtocolState.protocolId, user.currentProtocolId)
            )
          )
          .limit(1);
        phaseId = state?.currentPhaseId ?? null;
      } catch {
        phaseId = null;
      }

      // Check compliance for each food
      const compliance: Record<string, string> = {};
      for (const food of matchingFoods) {
        const complianceResult = await checkFoodCompliance(
          food.id,
          user.currentProtocolId,
          phaseId
        );

        if (complianceResult.violations.length > 0) {
          compliance[food.displayName] =
            `${complianceResult.status} - ${complianceResult.violations.join(", ")}`;
        } else {
          compliance[food.displayName] = complianceResult.status;
        }
      }

      // Get protocol name
      const [protocolData] = await db
        .select({ name: sql<string>`p.name` })
        .from(sql`protocols p`)
        .where(sql`p.id = ${user.currentProtocolId}`)
        .limit(1);

      protocolInfo = {
        protocolName: protocolData?.name || "Unknown protocol",
        compliance,
      };
    }
  }

  return {
    result: {
      found: true,
      foods: matchingFoods.map((f) => ({
        name: f.displayName,
        category: f.categoryName,
        subcategory: f.subcategoryName,
      })),
      ...(protocolInfo && { protocol: protocolInfo }),
    },
  };
}

async function handleLogJournalScores(
  input: JournalScoresInput,
  userId: string
): Promise<{ result: unknown }> {
  const today = new Date().toISOString().split("T")[0];
  const date = input.entry_date || today;

  const values: Record<string, unknown> = {
    userId,
    entryDate: date,
  };

  if (input.sleep_score !== undefined) values.sleepScore = input.sleep_score;
  if (input.energy_score !== undefined) values.energyScore = input.energy_score;
  if (input.mood_score !== undefined) values.moodScore = input.mood_score;
  if (input.stress_score !== undefined) values.stressScore = input.stress_score;
  if (input.pain_score !== undefined) values.painScore = input.pain_score;
  if (input.notes !== undefined) values.notes = input.notes;

  const [entry] = await db
    .insert(journalEntries)
    .values({
      userId,
      entryDate: date,
      sleepScore: input.sleep_score ?? null,
      energyScore: input.energy_score ?? null,
      moodScore: input.mood_score ?? null,
      stressScore: input.stress_score ?? null,
      painScore: input.pain_score ?? null,
      notes: input.notes ?? null,
    })
    .onConflictDoUpdate({
      target: [journalEntries.userId, journalEntries.entryDate],
      set: {
        ...(input.sleep_score !== undefined && { sleepScore: input.sleep_score }),
        ...(input.energy_score !== undefined && { energyScore: input.energy_score }),
        ...(input.mood_score !== undefined && { moodScore: input.mood_score }),
        ...(input.stress_score !== undefined && { stressScore: input.stress_score }),
        ...(input.pain_score !== undefined && { painScore: input.pain_score }),
        ...(input.notes !== undefined && { notes: input.notes }),
      },
    })
    .returning();

  const scoreSummary: string[] = [];
  if (input.sleep_score) scoreSummary.push(`Sleep: ${input.sleep_score}/10`);
  if (input.energy_score) scoreSummary.push(`Energy: ${input.energy_score}/10`);
  if (input.mood_score) scoreSummary.push(`Mood: ${input.mood_score}/10`);
  if (input.stress_score) scoreSummary.push(`Stress: ${input.stress_score}/10`);
  if (input.pain_score) scoreSummary.push(`Pain: ${input.pain_score}/10`);

  return {
    result: {
      success: true,
      message: `Logged journal scores for ${date}: ${scoreSummary.join(", ")}`,
      entryId: entry.id,
    },
  };
}

async function handleLogExercise(
  input: LogExerciseInput,
  userId: string,
  messageId: string | null
): Promise<{ result: unknown; entries: CreatedEntry[] }> {
  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  // Build structured content for exercise
  const structuredContent: Record<string, unknown> = {
    exerciseType: input.exercise_type,
    durationMinutes: input.duration_minutes,
    intensityLevel: input.intensity_level,
  };

  if (input.notes) {
    structuredContent.notes = input.notes;
  }

  // Create the exercise entry
  const [exerciseEntry] = await db
    .insert(timelineEntries)
    .values({
      userId,
      sourceMessageId: messageId,
      entryType: "exercise",
      name: `${input.exercise_type} (${input.duration_minutes} min, ${input.intensity_level})`,
      exerciseType: input.exercise_type,
      durationMinutes: input.duration_minutes,
      intensityLevel: input.intensity_level,
      energyLevel: input.energy_before ?? null,
      structuredContent,
      entryDate: today,
      entryTime: currentTime,
    })
    .returning({
      id: timelineEntries.id,
      entryType: timelineEntries.entryType,
      name: timelineEntries.name,
      entryDate: timelineEntries.entryDate,
      entryTime: timelineEntries.entryTime,
    });

  const created: CreatedEntry[] = [
    {
      id: exerciseEntry.id,
      entryType: exerciseEntry.entryType,
      name: exerciseEntry.name,
      severity: null,
      details: {
        duration_minutes: input.duration_minutes,
        intensity_level: input.intensity_level,
        energy_before: input.energy_before,
      },
      entryDate: exerciseEntry.entryDate,
      entryTime: exerciseEntry.entryTime,
      mealType: null,
      foodId: null,
      protocolViolations: [],
    },
  ];

  // If energy_after is provided, create a separate energy level entry
  if (input.energy_after !== undefined) {
    const [energyEntry] = await db
      .insert(timelineEntries)
      .values({
        userId,
        sourceMessageId: messageId,
        entryType: "energy",
        name: `Energy level: ${input.energy_after}/10`,
        energyLevel: input.energy_after,
        structuredContent: { energyLevel: input.energy_after },
        entryDate: today,
        entryTime: currentTime,
      })
      .returning({
        id: timelineEntries.id,
        entryType: timelineEntries.entryType,
        name: timelineEntries.name,
        entryDate: timelineEntries.entryDate,
        entryTime: timelineEntries.entryTime,
      });

    created.push({
      id: energyEntry.id,
      entryType: energyEntry.entryType,
      name: energyEntry.name,
      severity: null,
      details: {
        energyLevel: input.energy_after,
      },
      entryDate: energyEntry.entryDate,
      entryTime: energyEntry.entryTime,
      mealType: null,
      foodId: null,
      protocolViolations: [],
    });
  }

  // Build success message
  let message = `Logged ${input.exercise_type} exercise: ${input.duration_minutes} minutes at ${input.intensity_level} intensity`;
  if (input.energy_before !== undefined) {
    message += `, energy before: ${input.energy_before}/10`;
  }
  if (input.energy_after !== undefined) {
    message += `, energy after: ${input.energy_after}/10`;
  }

  return {
    result: {
      success: true,
      message,
      entries: created,
    },
    entries: created,
  };
}
