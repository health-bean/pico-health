import { z } from "zod";

const triggerLevel = z.enum(["unknown", "none", "low", "moderate", "high", "very_high"]);

export const customFoodPropertiesSchema = z.object({
  oxalate: triggerLevel.optional(),
  histamine: triggerLevel.optional(),
  lectin: triggerLevel.optional(),
  nightshade: z.boolean().optional(),
  fodmap: triggerLevel.optional(),
  salicylate: triggerLevel.optional(),
  amines: triggerLevel.optional(),
  glutamates: triggerLevel.optional(),
  sulfites: triggerLevel.optional(),
  goitrogens: triggerLevel.optional(),
  purines: triggerLevel.optional(),
  phytoestrogens: triggerLevel.optional(),
  phytates: triggerLevel.optional(),
  tyramine: triggerLevel.optional(),
});

// Column limits: display_name varchar(255), category/subcategory varchar(100).
const optionalLabel = z.string().trim().max(100).nullable().optional();

export const createCustomFoodSchema = z.object({
  displayName: z.string().trim().min(1, "displayName is required").max(255),
  category: optionalLabel,
  subcategory: optionalLabel,
  properties: customFoodPropertiesSchema.nullable().optional(),
});

export const updateCustomFoodSchema = z.object({
  displayName: z.string().trim().min(1, "displayName cannot be empty").max(255).optional(),
  category: optionalLabel,
  subcategory: optionalLabel,
  properties: customFoodPropertiesSchema.nullable().optional(),
});
