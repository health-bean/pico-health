import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  date,
  time,
  serial,
  uniqueIndex,
  index,
  numeric,
} from "drizzle-orm/pg-core";

// ─── Domain Data Tables (seeded from existing DB) ───────────────────────

export const foodCategories = pgTable("food_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
});

export const foodSubcategories = pgTable("food_subcategories", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => foodCategories.id),
  name: varchar("name", { length: 100 }).notNull(),
});

export const foods = pgTable("foods", {
  id: uuid("id").defaultRandom().primaryKey(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  subcategoryId: integer("subcategory_id")
    .notNull()
    .references(() => foodSubcategories.id),
  properties: jsonb("properties").$type<Record<string, unknown>>(),
  displayOrder: integer("display_order").default(0),
  isCommon: boolean("is_common").default(false),
  source: varchar("source", { length: 20 }).default("curated"),
  usdaFdcId: integer("usda_fdc_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const foodTriggerProperties = pgTable(
  "food_trigger_properties",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    foodId: uuid("food_id")
      .notNull()
      .references(() => foods.id, { onDelete: "cascade" }),
    oxalate: varchar("oxalate", { length: 20 }).default("unknown"),
    histamine: varchar("histamine", { length: 20 }).default("unknown"),
    lectin: varchar("lectin", { length: 20 }).default("unknown"),
    nightshade: boolean("nightshade").default(false),
    fodmap: varchar("fodmap", { length: 20 }).default("unknown"),
    salicylate: varchar("salicylate", { length: 20 }).default("unknown"),
    amines: varchar("amines", { length: 20 }).default("unknown"),
    glutamates: varchar("glutamates", { length: 20 }).default("unknown"),
    sulfites: varchar("sulfites", { length: 20 }).default("unknown"),
    goitrogens: varchar("goitrogens", { length: 20 }).default("unknown"),
    purines: varchar("purines", { length: 20 }).default("unknown"),
    phytoestrogens: varchar("phytoestrogens", { length: 20 }).default("unknown"),
    phytates: varchar("phytates", { length: 20 }).default("unknown"),
    tyramine: varchar("tyramine", { length: 20 }).default("unknown"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [uniqueIndex("food_trigger_food_id_idx").on(table.foodId)]
);

export const protocols = pgTable("protocols", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }),
  durationWeeks: integer("duration_weeks"),
  hasPhases: boolean("has_phases").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const protocolPhases = pgTable("protocol_phases", {
  id: uuid("id").defaultRandom().primaryKey(),
  protocolId: uuid("protocol_id")
    .notNull()
    .references(() => protocols.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 50 }).notNull(),
  phaseOrder: integer("phase_order").notNull(),
  durationWeeks: integer("duration_weeks"),
  description: text("description"),
  guidance: text("guidance"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const protocolRules = pgTable("protocol_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  protocolId: uuid("protocol_id")
    .notNull()
    .references(() => protocols.id, { onDelete: "cascade" }),
  phaseId: uuid("phase_id").references(() => protocolPhases.id, {
    onDelete: "cascade",
  }),
  ruleType: varchar("rule_type", { length: 50 }).notNull(),
  propertyName: varchar("property_name", { length: 50 }),
  propertyValues: text("property_values").array(),
  status: varchar("status", { length: 20 }).notNull(),
  ruleOrder: integer("rule_order").default(0),
  notes: text("notes"),
},
  (table) => [
    index("protocol_rules_protocol_id_idx").on(table.protocolId),
  ]
);

export const protocolFoodOverrides = pgTable(
  "protocol_food_overrides",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    protocolId: uuid("protocol_id")
      .notNull()
      .references(() => protocols.id, { onDelete: "cascade" }),
    foodId: uuid("food_id")
      .notNull()
      .references(() => foods.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 }).notNull(),
    overrideReason: text("override_reason"),
    notes: text("notes"),
  },
  (table) => [
    uniqueIndex("protocol_food_override_idx").on(table.protocolId, table.foodId),
  ]
);

// Reference data tables
export const symptomsDatabase = pgTable("symptoms_database", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  description: text("description"),
  isCommon: boolean("is_common").default(false),
});

export const supplementsDatabase = pgTable("supplements_database", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  description: text("description"),
  commonDosage: varchar("common_dosage", { length: 100 }),
});

export const medicationsDatabase = pgTable("medications_database", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  description: text("description"),
});

export const detoxTypes = pgTable("detox_types", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  description: text("description"),
});

// ─── App Tables ─────────────────────────────────────────────────────────

/**
 * Profiles table — stores app-specific user data.
 * The `id` column matches the Supabase Auth user UUID.
 * Auth (email, password, sessions) is handled by Supabase Auth.
 */
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // matches auth.users.id
  email: varchar("email", { length: 255 }).notNull().unique(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }),
  currentProtocolId: uuid("current_protocol_id").references(() => protocols.id, { onDelete: "set null" }),
  isAdmin: boolean("is_admin").default(false),
  // Onboarding tracking
  onboardingCompleted: boolean("onboarding_completed").default(false),
  onboardingStep: varchar("onboarding_step", { length: 50 }).default("welcome"),
  timezone: varchar("timezone", { length: 50 }).default("America/New_York"),
  healthGoals: text("health_goals").array(),
  // Capture-loop tracking goal ("Day 12 of 30" mandate strip)
  trackingGoalDays: integer("tracking_goal_days"),
  trackingGoalStartDate: date("tracking_goal_start_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});


export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).default("New conversation"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("conversations_user_id_updated_at_idx").on(
      table.userId,
      table.updatedAt
    ),
  ]
);

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(), // user | assistant
  content: text("content").notNull(),
  extractedData: jsonb("extracted_data"),
  createdAt: timestamp("created_at").defaultNow(),
},
  (table) => [
    index("messages_conversation_id_created_at_idx").on(
      table.conversationId,
      table.createdAt
    ),
  ]
);

export const timelineEntries = pgTable("timeline_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  sourceMessageId: uuid("source_message_id").references(() => messages.id, { onDelete: "set null" }),
  entryType: varchar("entry_type", { length: 20 }).notNull(), // food, symptom, supplement, medication, exposure, detox, exercise
  name: varchar("name", { length: 255 }).notNull(),
  severity: integer("severity"),
  structuredContent: jsonb("structured_content").$type<Record<string, unknown>>(),
  entryDate: date("entry_date").notNull(),
  entryTime: time("entry_time"),
  timezone: varchar("timezone", { length: 50 }),
  // Exercise tracking fields
  exerciseType: varchar("exercise_type", { length: 50 }),
  durationMinutes: integer("duration_minutes"),
  intensityLevel: varchar("intensity_level", { length: 20 }),
  energyLevel: integer("energy_level"),
  // Food logging fields
  foodId: uuid("food_id").references(() => foods.id, { onDelete: "set null" }),
  portion: varchar("portion", { length: 100 }),
  mealType: varchar("meal_type", { length: 20 }),
  // Sample data tracking
  isSample: boolean("is_sample").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
},
  (table) => [
    index("timeline_entries_user_id_entry_date_idx").on(
      table.userId,
      table.entryDate
    ),
    index("timeline_entries_user_id_entry_type_idx").on(
      table.userId,
      table.entryType
    ),
    index("timeline_entries_food_id_idx").on(table.foodId),
  ]
);

export const journalEntries = pgTable(
  "journal_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    entryDate: date("entry_date").notNull(),
    sleepScore: integer("sleep_score"),
    energyScore: integer("energy_score"),
    moodScore: integer("mood_score"),
    stressScore: integer("stress_score"),
    painScore: integer("pain_score"),
    notes: text("notes"),
    isSample: boolean("is_sample").default(false),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [uniqueIndex("journal_user_date_idx").on(table.userId, table.entryDate)]
);

export const userProtocolState = pgTable(
  "user_protocol_state",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    protocolId: uuid("protocol_id")
      .notNull()
      .references(() => protocols.id, { onDelete: "cascade" }),
    currentPhaseId: uuid("current_phase_id").references(
      () => protocolPhases.id
    ),
    phaseStartDate: date("phase_start_date").notNull(),
    expectedEndDate: date("expected_end_date"),
    startedAt: timestamp("started_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("user_protocol_state_idx").on(table.userId, table.protocolId),
  ]
);

export const reintroductionLog = pgTable("reintroduction_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  protocolId: uuid("protocol_id")
    .notNull()
    .references(() => protocols.id, { onDelete: "cascade" }),
  foodId: uuid("food_id").references(() => foods.id, { onDelete: "set null" }),
  foodName: varchar("food_name", { length: 255 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, passed, failed, inconclusive
  outcome: text("outcome"),
  symptomsSummary: jsonb("symptoms_summary").$type<Record<string, unknown>>(),
  // Enhanced tracking fields
  currentPhase: varchar("current_phase", { length: 20 }).default("testing"),
  currentDay: integer("current_day").default(1),
  lastLogDate: date("last_log_date"),
  missedDays: integer("missed_days").default(0),
  analysisDate: date("analysis_date"),
  analysisNotes: text("analysis_notes"),
  cancellationDate: date("cancellation_date"),
  cancellationReason: text("cancellation_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
},
  (table) => [
    index("reintroduction_log_user_id_status_idx").on(
      table.userId,
      table.status
    ),
    index("reintroduction_log_food_id_user_id_idx").on(
      table.foodId,
      table.userId
    ),
    index("reintroduction_log_user_id_start_date_idx").on(
      table.userId,
      table.startDate
    ),
  ]
);

// ─── Reintroduction Tracking ────────────────────────────────────────────

export const reintroductionEntries = pgTable(
  "reintroduction_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reintroductionId: uuid("reintroduction_id")
      .notNull()
      .references(() => reintroductionLog.id, { onDelete: "cascade" }),
    timelineEntryId: uuid("timeline_entry_id")
      .notNull()
      .references(() => timelineEntries.id, { onDelete: "cascade" }),
    entryPhase: varchar("entry_phase", { length: 20 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("reintroduction_entries_timeline_entry_id_unique").on(
      table.timelineEntryId
    ),
  ]
);

// ─── Custom Foods ───────────────────────────────────────────────────────

export const customFoods = pgTable("custom_foods", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  subcategory: varchar("subcategory", { length: 100 }),
  isArchived: boolean("is_archived").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
},
  (table) => [
    index("custom_foods_user_id_idx").on(table.userId),
  ]
);

export const customFoodProperties = pgTable(
  "custom_food_properties",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    customFoodId: uuid("custom_food_id")
      .notNull()
      .references(() => customFoods.id, { onDelete: "cascade" }),
    oxalate: varchar("oxalate", { length: 20 }).default("unknown"),
    histamine: varchar("histamine", { length: 20 }).default("unknown"),
    lectin: varchar("lectin", { length: 20 }).default("unknown"),
    nightshade: boolean("nightshade").default(false),
    fodmap: varchar("fodmap", { length: 20 }).default("unknown"),
    salicylate: varchar("salicylate", { length: 20 }).default("unknown"),
    amines: varchar("amines", { length: 20 }).default("unknown"),
    glutamates: varchar("glutamates", { length: 20 }).default("unknown"),
    sulfites: varchar("sulfites", { length: 20 }).default("unknown"),
    goitrogens: varchar("goitrogens", { length: 20 }).default("unknown"),
    purines: varchar("purines", { length: 20 }).default("unknown"),
    phytoestrogens: varchar("phytoestrogens", { length: 20 }).default("unknown"),
    phytates: varchar("phytates", { length: 20 }).default("unknown"),
    tyramine: varchar("tyramine", { length: 20 }).default("unknown"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("custom_food_properties_custom_food_id_unique").on(
      table.customFoodId
    ),
  ]
);

// ─── Audit Log (admin operation tracking for HIPAA compliance) ────────

export const auditLog = pgTable("audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => profiles.id, { onDelete: "set null" }),
  action: varchar("action", { length: 100 }).notNull(), // e.g. "food.update", "user.admin_toggle"
  targetType: varchar("target_type", { length: 50 }).notNull(), // e.g. "food", "user", "protocol"
  targetId: varchar("target_id", { length: 255 }),
  details: jsonb("details").$type<Record<string, unknown>>(),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at").defaultNow(),
},
  (table) => [
    index("audit_log_user_id_idx").on(table.userId),
    index("audit_log_action_idx").on(table.action),
    index("audit_log_created_at_idx").on(table.createdAt),
  ]
);

// ─── User Notifications ──────────────────────────────────────────────

export const userNotifications = pgTable("user_notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(), // e.g. "reintroduction_reminder", "tracking_reminder", "insight"
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body"),
  isRead: boolean("is_read").default(false),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
},
  (table) => [
    index("user_notifications_user_id_read_idx").on(table.userId, table.isRead),
  ]
);

// ─── Subscriptions ───────────────────────────────────────────────────

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  tier: varchar("tier", { length: 20 }).notNull().default("free"), // free, basic, premium
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  stripePriceId: varchar("stripe_price_id", { length: 255 }),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, past_due, canceled, trialing
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
},
  (table) => [
    uniqueIndex("subscriptions_user_id_idx").on(table.userId),
    index("subscriptions_stripe_customer_id_idx").on(table.stripeCustomerId),
    index("subscriptions_stripe_subscription_id_idx").on(table.stripeSubscriptionId),
  ]
);

// ─── User Food Reactions (confirmed outcomes from reintroductions) ────

export const userFoodReactions = pgTable(
  "user_food_reactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    foodId: uuid("food_id").references(() => foods.id, { onDelete: "set null" }),
    foodName: varchar("food_name", { length: 255 }).notNull(),
    status: varchar("status", { length: 20 }).notNull(), // safe, unsafe, sensitive
    reintroductionId: uuid("reintroduction_id").references(() => reintroductionLog.id, { onDelete: "set null" }),
    confirmedDate: date("confirmed_date").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("user_food_reactions_user_id_idx").on(table.userId),
    uniqueIndex("user_food_reactions_user_food_idx").on(table.userId, table.foodName),
  ]
);

// ─── Insights v2 Tables ────────────────────────────────────────────────

export const dayComposites = pgTable(
  "day_composites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    foodCount: integer("food_count").notNull().default(0),
    symptomCount: integer("symptom_count").notNull().default(0),
    supplementCount: integer("supplement_count").notNull().default(0),
    medicationCount: integer("medication_count").notNull().default(0),
    exposureCount: integer("exposure_count").notNull().default(0),
    exerciseCount: integer("exercise_count").notNull().default(0),
    sleepScore: integer("sleep_score"),
    energyScore: integer("energy_score"),
    moodScore: integer("mood_score"),
    stressScore: integer("stress_score"),
    painScore: integer("pain_score"),
    protocolId: uuid("protocol_id").references(() => protocols.id),
    compliancePct: numeric("compliance_pct", { precision: 5, scale: 2 }),
    violationCount: integer("violation_count").notNull().default(0),
    foods: jsonb("foods").notNull().default([]),
    symptoms: jsonb("symptoms").notNull().default([]),
    supplements: jsonb("supplements").notNull().default([]),
    medications: jsonb("medications").notNull().default([]),
    exposures: jsonb("exposures").notNull().default([]),
    exercises: jsonb("exercises").notNull().default([]),
    entryCount: integer("entry_count").notNull().default(0),
    hasJournal: boolean("has_journal").notNull().default(false),
    isFlareDay: boolean("is_flare_day").notNull().default(false),
    hasLateMeal: boolean("has_late_meal").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("day_composites_user_date_idx").on(table.userId, table.date),
  ]
);

export const insightSnapshots = pgTable("insight_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  computedAt: timestamp("computed_at", { withTimezone: true }).defaultNow().notNull(),
  daysAnalyzed: integer("days_analyzed").notNull(),
  triggers: jsonb("triggers").notNull().default([]),
  helpers: jsonb("helpers").notNull().default([]),
  patterns: jsonb("patterns").notNull().default([]),
  progress: jsonb("progress").notNull().default([]),
  singleCount: integer("single_count").notNull().default(0),
  twoFactorCount: integer("two_factor_count").notNull().default(0),
  threeFactorCount: integer("three_factor_count").notNull().default(0),
});

export const insightAlerts = pgTable("insight_alerts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  alertType: text("alert_type").notNull(),
  insightKey: text("insight_key").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  detail: jsonb("detail").notNull().default({}),
  dismissed: boolean("dismissed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
});
