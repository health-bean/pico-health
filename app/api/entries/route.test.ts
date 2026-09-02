import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { timelineEntries, profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

describe.skipIf(!process.env.RUN_DB_TESTS)("Food Logging with Database References", () => {
  let testUserId: string;

  beforeAll(async () => {
    // Create test user
    const [user] = await db
      .insert(profiles)
      .values({
        id: crypto.randomUUID(),
        email: `test-food-logging-${Date.now()}@example.com`,
        firstName: "Test",
      })
      .returning();
    testUserId = user.id;
  });

  afterAll(async () => {
    // Cleanup test data
    if (testUserId) {
      await db.delete(timelineEntries).where(eq(timelineEntries.userId, testUserId));
      await db.delete(profiles).where(eq(profiles.id, testUserId));
    }
  });

  it("should create a food entry with portion and meal_type", async () => {
    const [entry] = await db
      .insert(timelineEntries)
      .values({
        userId: testUserId,
        entryType: "food",
        name: "Chicken Breast",
        foodId: null, // No food_id for this test
        portion: "6 oz",
        mealType: "lunch",
        entryDate: "2024-01-15",
        entryTime: "12:30:00",
      })
      .returning();

    expect(entry).toBeDefined();
    expect(entry.entryType).toBe("food");
    expect(entry.name).toBe("Chicken Breast");
    expect(entry.portion).toBe("6 oz");
    expect(entry.mealType).toBe("lunch");
  });

  it("should accept food entry without food_id (backward compatibility)", async () => {
    const [entry] = await db
      .insert(timelineEntries)
      .values({
        userId: testUserId,
        entryType: "food",
        name: "Homemade Soup",
        portion: "1 bowl",
        mealType: "dinner",
        entryDate: "2024-01-15",
      })
      .returning();

    expect(entry.name).toBe("Homemade Soup");
    expect(entry.foodId).toBeNull();
    expect(entry.portion).toBe("1 bowl");
    expect(entry.mealType).toBe("dinner");
  });

  it("should accept food entry with minimal fields", async () => {
    const [entry] = await db
      .insert(timelineEntries)
      .values({
        userId: testUserId,
        entryType: "food",
        name: "Apple",
        entryDate: "2024-01-15",
      })
      .returning();

    expect(entry.name).toBe("Apple");
    expect(entry.foodId).toBeNull();
    expect(entry.portion).toBeNull();
    expect(entry.mealType).toBeNull();
  });

  it("should retrieve food entries with all fields", async () => {
    // Create entry
    await db.insert(timelineEntries).values({
      userId: testUserId,
      entryType: "food",
      name: "Salmon",
      foodId: null,
      portion: "4 oz",
      mealType: "dinner",
      entryDate: "2024-01-16",
      entryTime: "18:00:00",
    });

    // Retrieve entry
    const entries = await db
      .select()
      .from(timelineEntries)
      .where(eq(timelineEntries.userId, testUserId))
      .orderBy(timelineEntries.entryDate);

    const salmonEntry = entries.find((e) => e.name === "Salmon");
    expect(salmonEntry).toBeDefined();
    expect(salmonEntry?.portion).toBe("4 oz");
    expect(salmonEntry?.mealType).toBe("dinner");
  });

  it("should enforce meal_type constraint", async () => {
    // This should fail at the database level due to CHECK constraint
    await expect(
      db.insert(timelineEntries).values({
        userId: testUserId,
        entryType: "food",
        name: "Pizza",
        mealType: "invalid_meal" as any,
        entryDate: "2024-01-15",
      })
    ).rejects.toThrow();
  });

  it("should allow null values for food-specific fields", async () => {
    const [entry] = await db
      .insert(timelineEntries)
      .values({
        userId: testUserId,
        entryType: "food",
        name: "Mystery Food",
        foodId: null,
        portion: null,
        mealType: null,
        entryDate: "2024-01-15",
      })
      .returning();

    expect(entry.foodId).toBeNull();
    expect(entry.portion).toBeNull();
    expect(entry.mealType).toBeNull();
  });
});

describe.skipIf(!process.env.RUN_DB_TESTS)("Reintroduction Tracking Integration", () => {
  let testUserId: string;
  let testProtocolId: string;
  let testFoodId: string;
  let testReintroductionId: string;

  beforeAll(async () => {
    const { protocols, foods, reintroductionLog } = await import("@/lib/db/schema");
    
    // Create test user
    const [user] = await db
      .insert(users)
      .values({
        email: `test-reintro-tracking-${Date.now()}@example.com`,
        passwordHash: "test-hash",
        firstName: "Test",
      })
      .returning();
    testUserId = user.id;

    // Create test protocol
    const [protocol] = await db
      .insert(protocols)
      .values({
        name: "Test Protocol",
        description: "Test protocol for reintroduction tracking",
      })
      .returning();
    testProtocolId = protocol.id;

    // Create test food
    const [food] = await db
      .insert(foods)
      .values({
        displayName: "Test Tomatoes",
        subcategoryId: "00000000-0000-0000-0000-000000000001", // Placeholder
      })
      .returning();
    testFoodId = food.id;

    // Create active reintroduction
    const [reintroduction] = await db
      .insert(reintroductionLog)
      .values({
        userId: testUserId,
        protocolId: testProtocolId,
        foodId: testFoodId,
        foodName: "Test Tomatoes",
        startDate: "2024-01-15",
        status: "active",
        currentPhase: "testing",
        currentDay: 1,
      })
      .returning();
    testReintroductionId = reintroduction.id;
  });

  afterAll(async () => {
    const { protocols, foods, reintroductionLog, reintroductionEntries } = await import("@/lib/db/schema");
    
    // Cleanup test data
    if (testUserId) {
      await db.delete(reintroductionEntries).where(eq(reintroductionEntries.reintroductionId, testReintroductionId));
      await db.delete(reintroductionLog).where(eq(reintroductionLog.id, testReintroductionId));
      await db.delete(timelineEntries).where(eq(timelineEntries.userId, testUserId));
      await db.delete(foods).where(eq(foods.id, testFoodId));
      await db.delete(protocols).where(eq(protocols.id, testProtocolId));
      await db.delete(profiles).where(eq(profiles.id, testUserId));
    }
  });

  it("should link food entry to active reintroduction", async () => {
    const { reintroductionEntries } = await import("@/lib/db/schema");
    const { trackReintroductionEntry } = await import("@/lib/reintroductions/tracking");

    // Create a food entry
    const [entry] = await db
      .insert(timelineEntries)
      .values({
        userId: testUserId,
        entryType: "food",
        name: "Test Tomatoes",
        foodId: testFoodId,
        portion: "1 medium",
        mealType: "lunch",
        entryDate: "2024-01-15",
      })
      .returning();

    // Track the reintroduction
    const result = await trackReintroductionEntry(
      testUserId,
      testFoodId,
      entry.id,
      "2024-01-15"
    );

    expect(result.linked).toBe(true);
    expect(result.reintroductionId).toBe(testReintroductionId);
    expect(result.currentDay).toBe(1);
    expect(result.currentPhase).toBe("testing");

    // Verify reintroduction_entries record was created
    const [linkRecord] = await db
      .select()
      .from(reintroductionEntries)
      .where(eq(reintroductionEntries.timelineEntryId, entry.id));

    expect(linkRecord).toBeDefined();
    expect(linkRecord.reintroductionId).toBe(testReintroductionId);
    expect(linkRecord.entryPhase).toBe("testing");
  });

  it("should update reintroduction tracking fields when food is logged", async () => {
    const { reintroductionLog } = await import("@/lib/db/schema");
    const { trackReintroductionEntry } = await import("@/lib/reintroductions/tracking");

    // Create a food entry for day 2
    const [entry] = await db
      .insert(timelineEntries)
      .values({
        userId: testUserId,
        entryType: "food",
        name: "Test Tomatoes",
        foodId: testFoodId,
        portion: "1 medium",
        mealType: "dinner",
        entryDate: "2024-01-16",
      })
      .returning();

    // Track the reintroduction
    await trackReintroductionEntry(
      testUserId,
      testFoodId,
      entry.id,
      "2024-01-16"
    );

    // Verify reintroduction_log was updated
    const [updated] = await db
      .select()
      .from(reintroductionLog)
      .where(eq(reintroductionLog.id, testReintroductionId));

    expect(updated.currentDay).toBe(2);
    expect(updated.lastLogDate).toBe("2024-01-16");
    expect(updated.currentPhase).toBe("testing");
  });

  it("should transition to observation phase on day 4", async () => {
    const { reintroductionLog } = await import("@/lib/db/schema");
    const { trackReintroductionEntry } = await import("@/lib/reintroductions/tracking");

    // Create a food entry for day 4
    const [entry] = await db
      .insert(timelineEntries)
      .values({
        userId: testUserId,
        entryType: "food",
        name: "Test Tomatoes",
        foodId: testFoodId,
        portion: "1 medium",
        mealType: "breakfast",
        entryDate: "2024-01-18",
      })
      .returning();

    // Track the reintroduction
    const result = await trackReintroductionEntry(
      testUserId,
      testFoodId,
      entry.id,
      "2024-01-18"
    );

    expect(result.currentDay).toBe(4);
    expect(result.currentPhase).toBe("observation");

    // Verify in database
    const [updated] = await db
      .select()
      .from(reintroductionLog)
      .where(eq(reintroductionLog.id, testReintroductionId));

    expect(updated.currentPhase).toBe("observation");
  });

  it("should track missed days during testing phase", async () => {
    const { reintroductionLog } = await import("@/lib/db/schema");
    const { trackReintroductionEntry } = await import("@/lib/reintroductions/tracking");

    // Update reintroduction to have a last log date
    await db
      .update(reintroductionLog)
      .set({
        lastLogDate: "2024-01-15",
        currentDay: 1,
        currentPhase: "testing",
        missedDays: 0,
      })
      .where(eq(reintroductionLog.id, testReintroductionId));

    // Create a food entry 3 days later (2 missed days)
    const [entry] = await db
      .insert(timelineEntries)
      .values({
        userId: testUserId,
        entryType: "food",
        name: "Test Tomatoes",
        foodId: testFoodId,
        portion: "1 medium",
        mealType: "lunch",
        entryDate: "2024-01-18",
      })
      .returning();

    // Track the reintroduction
    await trackReintroductionEntry(
      testUserId,
      testFoodId,
      entry.id,
      "2024-01-18"
    );

    // Verify missed days were tracked
    const [updated] = await db
      .select()
      .from(reintroductionLog)
      .where(eq(reintroductionLog.id, testReintroductionId));

    expect(updated.missedDays).toBe(2);
  });

  it("should not link entry when no active reintroduction exists", async () => {
    const { reintroductionEntries } = await import("@/lib/db/schema");
    const { trackReintroductionEntry } = await import("@/lib/reintroductions/tracking");

    // Create a food entry for a different food (no active reintroduction)
    const [entry] = await db
      .insert(timelineEntries)
      .values({
        userId: testUserId,
        entryType: "food",
        name: "Chicken",
        foodId: "00000000-0000-0000-0000-000000000099", // Different food
        portion: "6 oz",
        mealType: "dinner",
        entryDate: "2024-01-15",
      })
      .returning();

    // Track the reintroduction
    const result = await trackReintroductionEntry(
      testUserId,
      "00000000-0000-0000-0000-000000000099",
      entry.id,
      "2024-01-15"
    );

    expect(result.linked).toBe(false);

    // Verify no reintroduction_entries record was created
    const linkRecords = await db
      .select()
      .from(reintroductionEntries)
      .where(eq(reintroductionEntries.timelineEntryId, entry.id));

    expect(linkRecords.length).toBe(0);
  });

  it("should handle entries without foodId gracefully", async () => {
    const { trackReintroductionEntry } = await import("@/lib/reintroductions/tracking");

    // Create a food entry without foodId
    const [entry] = await db
      .insert(timelineEntries)
      .values({
        userId: testUserId,
        entryType: "food",
        name: "Homemade Soup",
        foodId: null,
        portion: "1 bowl",
        mealType: "dinner",
        entryDate: "2024-01-15",
      })
      .returning();

    // Track the reintroduction
    const result = await trackReintroductionEntry(
      testUserId,
      null,
      entry.id,
      "2024-01-15"
    );

    expect(result.linked).toBe(false);
  });
});
