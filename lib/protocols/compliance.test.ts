import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { checkCompliance, type FoodProperties } from "./compliance";
import { db } from "@/lib/db";
import { protocols, protocolRules, protocolFoodOverrides, foods, foodSubcategories, foodCategories, foodTriggerProperties } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

describe.skipIf(!process.env.RUN_DB_TESTS)("checkCompliance", () => {
  let testProtocolId: string;
  let testFoodId: string;

  beforeAll(async () => {
    // Create a test protocol
    const [protocol] = await db
      .insert(protocols)
      .values({
        name: "Test Protocol",
        description: "Test protocol for compliance checking",
        category: "test",
        isActive: true,
      })
      .returning();
    testProtocolId = protocol.id;

    // Create test rules
    await db.insert(protocolRules).values([
      {
        protocolId: testProtocolId,
        ruleType: "property",
        propertyName: "nightshade",
        propertyValues: ["true"],
        status: "avoid",
        notes: "Nightshades trigger inflammation",
      },
      {
        protocolId: testProtocolId,
        ruleType: "property",
        propertyName: "histamine",
        propertyValues: ["high", "very_high"],
        status: "avoid",
        notes: "High histamine foods restricted",
      },
      {
        protocolId: testProtocolId,
        ruleType: "property",
        propertyName: "oxalate",
        propertyValues: ["high"],
        status: "moderation",
        notes: "High oxalate foods should be limited",
      },
    ]);

    // Create a test food for override testing
    const [category] = await db
      .select()
      .from(foodCategories)
      .limit(1);
    
    const [subcategory] = await db
      .select()
      .from(foodSubcategories)
      .where(eq(foodSubcategories.categoryId, category.id))
      .limit(1);

    const [food] = await db
      .insert(foods)
      .values({
        displayName: "Test Tomato",
        subcategoryId: subcategory.id,
        isCommon: false,
      })
      .returning();
    testFoodId = food.id;

    // Add properties to the test food
    await db.insert(foodTriggerProperties).values({
      foodId: testFoodId,
      nightshade: true,
      histamine: "moderate",
      oxalate: "low",
    });
  });

  afterAll(async () => {
    // Clean up test data
    await db.delete(protocolFoodOverrides).where(eq(protocolFoodOverrides.protocolId, testProtocolId));
    await db.delete(protocolRules).where(eq(protocolRules.protocolId, testProtocolId));
    await db.delete(foodTriggerProperties).where(eq(foodTriggerProperties.foodId, testFoodId));
    await db.delete(foods).where(eq(foods.id, testFoodId));
    await db.delete(protocols).where(eq(protocols.id, testProtocolId));
  });

  it("should return 'avoid' status for nightshade foods", async () => {
    const properties: FoodProperties = {
      nightshade: true,
      histamine: "low",
      oxalate: "low",
    };

    const result = await checkCompliance(properties, testProtocolId);

    expect(result.status).toBe("avoid");
    expect(result.violations).toContain("Nightshade not allowed");
  });

  it("should return 'avoid' status for high histamine foods", async () => {
    const properties: FoodProperties = {
      nightshade: false,
      histamine: "high",
      oxalate: "low",
    };

    const result = await checkCompliance(properties, testProtocolId);

    expect(result.status).toBe("avoid");
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations.some(v => v.includes("Histamine"))).toBe(true);
  });

  it("should return 'moderation' status for high oxalate foods", async () => {
    const properties: FoodProperties = {
      nightshade: false,
      histamine: "low",
      oxalate: "high",
    };

    const result = await checkCompliance(properties, testProtocolId);

    expect(result.status).toBe("moderation");
    expect(result.violations.some(v => v.includes("Oxalate"))).toBe(true);
  });

  it("should return 'allowed' status for compliant foods", async () => {
    const properties: FoodProperties = {
      nightshade: false,
      histamine: "low",
      oxalate: "low",
    };

    const result = await checkCompliance(properties, testProtocolId);

    expect(result.status).toBe("allowed");
    expect(result.violations).toHaveLength(0);
  });

  it("should prioritize 'avoid' over 'moderation'", async () => {
    const properties: FoodProperties = {
      nightshade: true, // avoid
      histamine: "low",
      oxalate: "high", // moderation
    };

    const result = await checkCompliance(properties, testProtocolId);

    expect(result.status).toBe("avoid");
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it("should respect food overrides", async () => {
    // Add an override that allows the nightshade food
    await db.insert(protocolFoodOverrides).values({
      protocolId: testProtocolId,
      foodId: testFoodId,
      status: "allowed",
      overrideReason: "Well-tolerated by user",
    });

    const properties: FoodProperties = {
      nightshade: true,
      histamine: "low",
      oxalate: "low",
    };

    const result = await checkCompliance(
      properties,
      testProtocolId,
      null,
      testFoodId
    );

    expect(result.status).toBe("allowed");

    // Clean up override
    await db
      .delete(protocolFoodOverrides)
      .where(
        eq(protocolFoodOverrides.protocolId, testProtocolId)
      );
  });

  it("should handle category-based rules", async () => {
    // Add a category rule
    await db.insert(protocolRules).values({
      protocolId: testProtocolId,
      ruleType: "category",
      propertyValues: ["Dairy"],
      status: "avoid",
      notes: "Dairy not allowed",
    });

    const properties: FoodProperties = {
      nightshade: false,
      histamine: "low",
    };

    const result = await checkCompliance(
      properties,
      testProtocolId,
      null,
      null,
      "Dairy"
    );

    expect(result.status).toBe("avoid");
    expect(result.violations).toContain("Dairy not allowed");

    // Clean up
    await db
      .delete(protocolRules)
      .where(
        eq(protocolRules.protocolId, testProtocolId)
      );
  });
});
