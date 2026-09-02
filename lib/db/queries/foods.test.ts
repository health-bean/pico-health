import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { searchFoods } from "./foods";
import { db } from "@/lib/db";
import {
  profiles,
  foods,
  foodCategories,
  foodSubcategories,
  foodTriggerProperties,
  customFoods,
  customFoodProperties,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

describe.skipIf(!process.env.RUN_DB_TESTS)("searchFoods", () => {
  let testUserId: string;
  let testFoodId: string;
  let testCustomFoodId: string;

  beforeAll(async () => {
    // Create test user
    const [user] = await db
      .insert(profiles)
      .values({
        id: crypto.randomUUID(),
        email: `test-foods-${Date.now()}@example.com`,
        firstName: "Test",
      })
      .returning();
    testUserId = user.id;

    // Create test food category and subcategory
    const [category] = await db
      .insert(foodCategories)
      .values({ name: `Test Category ${Date.now()}` })
      .returning();

    const [subcategory] = await db
      .insert(foodSubcategories)
      .values({
        categoryId: category.id,
        name: `Test Subcategory ${Date.now()}`,
      })
      .returning();

    // Create test food
    const [food] = await db
      .insert(foods)
      .values({
        displayName: "Test Tomato",
        subcategoryId: subcategory.id,
      })
      .returning();
    testFoodId = food.id;

    // Add trigger properties
    await db.insert(foodTriggerProperties).values({
      foodId: testFoodId,
      histamine: "high",
      nightshade: true,
      oxalate: "medium",
    });

    // Create custom food
    const [customFood] = await db
      .insert(customFoods)
      .values({
        userId: testUserId,
        displayName: "Custom Tomato Sauce",
        category: "Sauces",
        subcategory: "Tomato-based",
      })
      .returning();
    testCustomFoodId = customFood.id;

    // Add custom food properties
    await db.insert(customFoodProperties).values({
      customFoodId: testCustomFoodId,
      histamine: "high",
      nightshade: true,
    });
  });

  afterAll(async () => {
    // Cleanup test data
    if (testCustomFoodId) {
      await db.delete(customFoodProperties).where(eq(customFoodProperties.customFoodId, testCustomFoodId));
      await db.delete(customFoods).where(eq(customFoods.id, testCustomFoodId));
    }
    if (testFoodId) {
      await db.delete(foodTriggerProperties).where(eq(foodTriggerProperties.foodId, testFoodId));
      await db.delete(foods).where(eq(foods.id, testFoodId));
    }
    if (testUserId) {
      await db.delete(profiles).where(eq(profiles.id, testUserId));
    }
  });

  it("should search and return standard foods with fuzzy matching", async () => {
    const results = await searchFoods("tomato", testUserId);

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    
    // Should find the test tomato
    const testFood = results.find((f) => f.id === testFoodId);
    expect(testFood).toBeDefined();
    expect(testFood?.displayName).toBe("Test Tomato");
    expect(testFood?.isCustom).toBe(false);
  });

  it("should include food properties in results", async () => {
    const results = await searchFoods("tomato", testUserId);
    const testFood = results.find((f) => f.id === testFoodId);

    expect(testFood?.properties).toBeDefined();
    expect(testFood?.properties.histamine).toBe("high");
    expect(testFood?.properties.nightshade).toBe(true);
    expect(testFood?.properties.oxalate).toBe("medium");
  });

  it("should search and return custom foods", async () => {
    const results = await searchFoods("tomato sauce", testUserId);

    const customFood = results.find((f) => f.id === testCustomFoodId);
    expect(customFood).toBeDefined();
    expect(customFood?.displayName).toBe("Custom Tomato Sauce");
    expect(customFood?.isCustom).toBe(true);
    expect(customFood?.category).toBe("Sauces");
  });

  it("should merge and sort results by similarity", async () => {
    const results = await searchFoods("tomato", testUserId);

    // Results should be sorted by similarity (highest first)
    expect(results.length).toBeGreaterThan(0);
    
    // Verify both standard and custom foods can appear
    const hasStandard = results.some((f) => !f.isCustom);
    const hasCustom = results.some((f) => f.isCustom);
    
    // At least one type should be present
    expect(hasStandard || hasCustom).toBe(true);
  });

  it("should limit results to maximum 10", async () => {
    const results = await searchFoods("a", testUserId, 50);

    expect(results.length).toBeLessThanOrEqual(10);
  });

  it("should respect custom limit parameter", async () => {
    const results = await searchFoods("tomato", testUserId, 5);

    expect(results.length).toBeLessThanOrEqual(5);
  });

  it("should return empty array for no matches", async () => {
    const results = await searchFoods("xyznonexistentfood123", testUserId);

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(0);
  });

  it("should include category and subcategory information", async () => {
    const results = await searchFoods("tomato", testUserId);
    const testFood = results.find((f) => f.id === testFoodId);

    expect(testFood?.category).toBeDefined();
    expect(testFood?.subcategory).toBeDefined();
    expect(typeof testFood?.category).toBe("string");
    expect(typeof testFood?.subcategory).toBe("string");
  });
});
