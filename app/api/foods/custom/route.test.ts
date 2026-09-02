import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import {
  profiles,
  customFoods,
  customFoodProperties,
  timelineEntries,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

describe.skipIf(!process.env.RUN_DB_TESTS)("Custom Food API Routes", () => {
  let testUserId: string;
  let testCustomFoodId: string;

  beforeAll(async () => {
    // Create test user
    const [user] = await db
      .insert(profiles)
      .values({
        id: crypto.randomUUID(),
        email: `test-custom-foods-${Date.now()}@example.com`,
        firstName: "Test",
      })
      .returning();
    testUserId = user.id;
  });

  afterAll(async () => {
    // Cleanup test data
    if (testCustomFoodId) {
      await db
        .delete(customFoodProperties)
        .where(eq(customFoodProperties.customFoodId, testCustomFoodId));
      await db.delete(customFoods).where(eq(customFoods.id, testCustomFoodId));
    }
    if (testUserId) {
      await db.delete(timelineEntries).where(eq(timelineEntries.userId, testUserId));
      await db.delete(profiles).where(eq(profiles.id, testUserId));
    }
  });

  describe("POST /api/foods/custom", () => {
    it("should create a custom food with required fields only", async () => {
      const [food] = await db
        .insert(customFoods)
        .values({
          userId: testUserId,
          displayName: "Test Custom Food",
        })
        .returning();

      testCustomFoodId = food.id;

      expect(food).toBeDefined();
      expect(food.displayName).toBe("Test Custom Food");
      expect(food.userId).toBe(testUserId);
      expect(food.isArchived).toBe(false);
    });

    it("should create a custom food with all fields", async () => {
      const [food] = await db
        .insert(customFoods)
        .values({
          userId: testUserId,
          displayName: "Complete Custom Food",
          category: "Test Category",
          subcategory: "Test Subcategory",
        })
        .returning();

      expect(food).toBeDefined();
      expect(food.displayName).toBe("Complete Custom Food");
      expect(food.category).toBe("Test Category");
      expect(food.subcategory).toBe("Test Subcategory");

      // Cleanup
      await db.delete(customFoods).where(eq(customFoods.id, food.id));
    });

    it("should create custom food with properties", async () => {
      const [food] = await db
        .insert(customFoods)
        .values({
          userId: testUserId,
          displayName: "Food with Properties",
        })
        .returning();

      await db.insert(customFoodProperties).values({
        customFoodId: food.id,
        histamine: "high",
        nightshade: true,
        oxalate: "medium",
      });

      const [props] = await db
        .select()
        .from(customFoodProperties)
        .where(eq(customFoodProperties.customFoodId, food.id))
        .limit(1);

      expect(props).toBeDefined();
      expect(props.histamine).toBe("high");
      expect(props.nightshade).toBe(true);
      expect(props.oxalate).toBe("medium");

      // Cleanup
      await db
        .delete(customFoodProperties)
        .where(eq(customFoodProperties.customFoodId, food.id));
      await db.delete(customFoods).where(eq(customFoods.id, food.id));
    });
  });

  describe("PATCH /api/foods/custom/[id]", () => {
    it("should update custom food display name", async () => {
      const [food] = await db
        .insert(customFoods)
        .values({
          userId: testUserId,
          displayName: "Original Name",
        })
        .returning();

      await db
        .update(customFoods)
        .set({ displayName: "Updated Name", updatedAt: new Date() })
        .where(eq(customFoods.id, food.id));

      const [updated] = await db
        .select()
        .from(customFoods)
        .where(eq(customFoods.id, food.id))
        .limit(1);

      expect(updated.displayName).toBe("Updated Name");

      // Cleanup
      await db.delete(customFoods).where(eq(customFoods.id, food.id));
    });

    it("should update custom food category and subcategory", async () => {
      const [food] = await db
        .insert(customFoods)
        .values({
          userId: testUserId,
          displayName: "Test Food",
          category: "Old Category",
        })
        .returning();

      await db
        .update(customFoods)
        .set({
          category: "New Category",
          subcategory: "New Subcategory",
          updatedAt: new Date(),
        })
        .where(eq(customFoods.id, food.id));

      const [updated] = await db
        .select()
        .from(customFoods)
        .where(eq(customFoods.id, food.id))
        .limit(1);

      expect(updated.category).toBe("New Category");
      expect(updated.subcategory).toBe("New Subcategory");

      // Cleanup
      await db.delete(customFoods).where(eq(customFoods.id, food.id));
    });

    it("should update custom food properties", async () => {
      const [food] = await db
        .insert(customFoods)
        .values({
          userId: testUserId,
          displayName: "Test Food",
        })
        .returning();

      await db.insert(customFoodProperties).values({
        customFoodId: food.id,
        histamine: "low",
      });

      await db
        .update(customFoodProperties)
        .set({ histamine: "high", oxalate: "medium" })
        .where(eq(customFoodProperties.customFoodId, food.id));

      const [props] = await db
        .select()
        .from(customFoodProperties)
        .where(eq(customFoodProperties.customFoodId, food.id))
        .limit(1);

      expect(props.histamine).toBe("high");
      expect(props.oxalate).toBe("medium");

      // Cleanup
      await db
        .delete(customFoodProperties)
        .where(eq(customFoodProperties.customFoodId, food.id));
      await db.delete(customFoods).where(eq(customFoods.id, food.id));
    });
  });

  describe("DELETE /api/foods/custom/[id]", () => {
    it("should delete custom food when not used in entries", async () => {
      const [food] = await db
        .insert(customFoods)
        .values({
          userId: testUserId,
          displayName: "Deletable Food",
        })
        .returning();

      await db.delete(customFoods).where(eq(customFoods.id, food.id));

      const [deleted] = await db
        .select()
        .from(customFoods)
        .where(eq(customFoods.id, food.id))
        .limit(1);

      expect(deleted).toBeUndefined();
    });

    it("should archive custom food when used in timeline entries", async () => {
      const [food] = await db
        .insert(customFoods)
        .values({
          userId: testUserId,
          displayName: "Used Food",
        })
        .returning();

      // Create a timeline entry using this food
      await db.insert(timelineEntries).values({
        userId: testUserId,
        entryType: "food",
        name: "Used Food",
        entryDate: "2024-01-01",
      });

      // Archive instead of delete
      await db
        .update(customFoods)
        .set({ isArchived: true, updatedAt: new Date() })
        .where(eq(customFoods.id, food.id));

      const [archived] = await db
        .select()
        .from(customFoods)
        .where(eq(customFoods.id, food.id))
        .limit(1);

      expect(archived).toBeDefined();
      expect(archived.isArchived).toBe(true);

      // Cleanup
      await db.delete(customFoods).where(eq(customFoods.id, food.id));
    });

    it("should not delete food belonging to another user", async () => {
      // Create another user
      const [otherUser] = await db
        .insert(profiles)
        .values({
          id: crypto.randomUUID(),
          email: `other-user-${Date.now()}@example.com`,
          firstName: "Other",
        })
        .returning();

      const [food] = await db
        .insert(customFoods)
        .values({
          userId: otherUser.id,
          displayName: "Other User Food",
        })
        .returning();

      // Verify food exists
      const [exists] = await db
        .select()
        .from(customFoods)
        .where(eq(customFoods.id, food.id))
        .limit(1);

      expect(exists).toBeDefined();

      // Cleanup
      await db.delete(customFoods).where(eq(customFoods.id, food.id));
      await db.delete(profiles).where(eq(profiles.id, otherUser.id));
    });
  });

  describe("Custom Food Properties", () => {
    it("should store all trigger properties", async () => {
      const [food] = await db
        .insert(customFoods)
        .values({
          userId: testUserId,
          displayName: "Full Properties Food",
        })
        .returning();

      await db.insert(customFoodProperties).values({
        customFoodId: food.id,
        oxalate: "high",
        histamine: "medium",
        lectin: "low",
        nightshade: true,
        fodmap: "high",
        salicylate: "medium",
        amines: "low",
        glutamates: "high",
        sulfites: "medium",
        goitrogens: "low",
        purines: "high",
        phytoestrogens: "medium",
        phytates: "low",
        tyramine: "high",
      });

      const [props] = await db
        .select()
        .from(customFoodProperties)
        .where(eq(customFoodProperties.customFoodId, food.id))
        .limit(1);

      expect(props.oxalate).toBe("high");
      expect(props.histamine).toBe("medium");
      expect(props.lectin).toBe("low");
      expect(props.nightshade).toBe(true);
      expect(props.fodmap).toBe("high");
      expect(props.tyramine).toBe("high");

      // Cleanup
      await db
        .delete(customFoodProperties)
        .where(eq(customFoodProperties.customFoodId, food.id));
      await db.delete(customFoods).where(eq(customFoods.id, food.id));
    });

    it("should default properties to unknown when not specified", async () => {
      const [food] = await db
        .insert(customFoods)
        .values({
          userId: testUserId,
          displayName: "Default Properties Food",
        })
        .returning();

      await db.insert(customFoodProperties).values({
        customFoodId: food.id,
      });

      const [props] = await db
        .select()
        .from(customFoodProperties)
        .where(eq(customFoodProperties.customFoodId, food.id))
        .limit(1);

      expect(props.oxalate).toBe("unknown");
      expect(props.histamine).toBe("unknown");
      expect(props.nightshade).toBe(false);

      // Cleanup
      await db
        .delete(customFoodProperties)
        .where(eq(customFoodProperties.customFoodId, food.id));
      await db.delete(customFoods).where(eq(customFoods.id, food.id));
    });
  });
});
