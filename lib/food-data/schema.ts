import { z } from "zod";
import { FOOD_PROPERTIES } from "@/lib/sources/properties";
import { LEVELS } from "./compute";

/** Properties that take measurements. Nightshade is a yes/no botanical fact. */
export const MEASURED_PROPERTIES = FOOD_PROPERTIES.filter((p) => p !== "nightshade");
export const measuredProperty = z.enum(MEASURED_PROPERTIES as [string, ...string[]]);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => v || null);

const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => {
    try {
      return new URL(v).protocol === "https:";
    } catch {
      return false;
    }
  }, "Link must be a full https:// address")
  .nullish()
  .or(z.literal("").transform(() => null));

const thisYear = new Date().getFullYear();

const measurementFields = {
  property: measuredProperty,
  valuePer100g: z.number().min(0).max(1_000_000).nullish(),
  unit: z.string().trim().min(1).max(20).default("mg"),
  reportedLevel: z.enum(LEVELS as [string, ...string[]]).nullish(),
  solublePct: z.number().min(0).max(100).nullish(),
  preparation: optionalText(120),
  sampleDescription: optionalText(1000),
  sourceId: z.string().uuid("Choose a source"),
  citation: z.string().trim().min(3, "Citation is required").max(2000),
  citationUrl: httpsUrl,
  studyYear: z.number().int().min(1900).max(thisYear).nullish(),
};

export const createMeasurementSchema = z
  .object(measurementFields)
  .refine((m) => m.valuePer100g != null || m.reportedLevel != null, {
    message: "Enter an amount per 100 g or a level",
  });

export const updateMeasurementSchema = z
  .object({
    ...measurementFields,
    excluded: z.boolean(),
    exclusionNote: optionalText(1000),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");

export const updateServingSchema = z.object({
  servingGrams: z.number().positive().max(10_000).nullable(),
  servingLabel: optionalText(60),
});

export const reviewSchema = z.object({
  property: measuredProperty,
  note: optionalText(2000),
});
