import Anthropic from "@anthropic-ai/sdk";

export const tools: Anthropic.Tool[] = [
  {
    name: "log_entries",
    description:
      "Log one or more health tracking entries from the conversation. Call this whenever the user mentions food they ate, symptoms they experienced, supplements or medications they took, or detox activities they did. Extract ALL trackable items from the user's message in a single call.",
    input_schema: {
      type: "object" as const,
      properties: {
        entries: {
          type: "array",
          description: "Array of entries to log",
          items: {
            type: "object",
            properties: {
              entry_type: {
                type: "string",
                enum: [
                  "food",
                  "symptom",
                  "supplement",
                  "medication",
                  "detox",
                  "exposure",
                ],
                description: "The type of entry to log",
              },
              name: {
                type: "string",
                description:
                  "Name of the item (e.g., 'scrambled eggs', 'headache', 'magnesium glycinate', 'ibuprofen', 'infrared sauna')",
              },
              severity: {
                type: "number",
                description:
                  "Severity on 1-10 scale. Only used for symptoms and exposures.",
              },
              details: {
                type: "string",
                description:
                  "Additional details like cooking method, dosage, duration, preparation notes, oil used, etc.",
              },
              meal_type: {
                type: "string",
                enum: ["breakfast", "lunch", "dinner", "snack"],
                description:
                  "Meal this food belongs to. Food entries only.",
              },
              portion: {
                type: "string",
                description:
                  "Portion size as stated by the user (e.g., '2 eggs', '1 cup', 'small bowl'). Optional.",
              },
              entry_date: {
                type: "string",
                description:
                  "Date of the entry in YYYY-MM-DD format. Defaults to today if not specified.",
              },
              entry_time: {
                type: "string",
                description:
                  "Time of the entry in HH:MM format (24-hour). Optional.",
              },
            },
            required: ["entry_type", "name"],
          },
        },
      },
      required: ["entries"],
    },
  },
  {
    name: "search_foods",
    description:
      "Search the food database to look up foods, check protocol compliance, or find food details. Use this when the user asks whether a food is allowed on their protocol, or when you need to verify food information.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "The food name or search term to look up",
        },
        check_protocol: {
          type: "boolean",
          description:
            "Whether to check if the food complies with the user's current protocol",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "log_journal_scores",
    description:
      "Log the user's daily wellness scores when they mention how they slept, their energy level, mood, stress, or pain. Use this when the user describes their overall wellbeing rather than specific symptoms. Scores are on a 1-10 scale where 10 is best (except stress and pain, where 10 is worst).",
    input_schema: {
      type: "object" as const,
      properties: {
        sleep_score: {
          type: "number",
          description: "Sleep quality score (1-10, 10 = best sleep)",
        },
        energy_score: {
          type: "number",
          description: "Energy level score (1-10, 10 = most energetic)",
        },
        mood_score: {
          type: "number",
          description: "Mood score (1-10, 10 = best mood)",
        },
        stress_score: {
          type: "number",
          description: "Stress level score (1-10, 10 = most stressed)",
        },
        pain_score: {
          type: "number",
          description: "Pain level score (1-10, 10 = worst pain)",
        },
        notes: {
          type: "string",
          description: "Optional notes about their overall state",
        },
        entry_date: {
          type: "string",
          description: "Date in YYYY-MM-DD format. Defaults to today.",
        },
      },
      required: [],
    },
  },
  {
    name: "log_exercise",
    description:
      "Log an exercise activity with duration, intensity, and optional energy levels. Use this when the user mentions physical activity like walking, running, yoga, swimming, cycling, strength training, stretching, sports, or other exercise.",
    input_schema: {
      type: "object" as const,
      properties: {
        exercise_type: {
          type: "string",
          enum: [
            "walking",
            "running",
            "cycling",
            "swimming",
            "yoga",
            "strength_training",
            "stretching",
            "sports",
            "other",
          ],
          description: "Type of exercise performed",
        },
        duration_minutes: {
          type: "number",
          description: "Duration of exercise in minutes",
        },
        intensity_level: {
          type: "string",
          enum: ["light", "moderate", "vigorous"],
          description: "Exercise intensity level",
        },
        energy_before: {
          type: "number",
          description: "Energy level before exercise (1-10 scale, optional)",
        },
        energy_after: {
          type: "number",
          description: "Energy level after exercise (1-10 scale, optional)",
        },
        notes: {
          type: "string",
          description: "Additional notes about the exercise",
        },
      },
      required: ["exercise_type", "duration_minutes", "intensity_level"],
    },
  },
];
