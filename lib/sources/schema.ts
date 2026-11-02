import { z } from "zod";
import { FOOD_PROPERTIES, SOURCE_USES } from "./properties";

const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .refine((value) => {
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }, "Enter a full web address starting with https://");

/** Body for creating a trusted source. */
export const createSourceSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  url: httpsUrl,
  trustedFor: z.array(z.enum(FOOD_PROPERTIES)).max(FOOD_PROPERTIES.length).default([]),
  useAs: z.enum(SOURCE_USES).default("data"),
  notes: z.string().trim().max(2000).nullish(),
  isActive: z.boolean().default(true),
});

/** Body for editing one: every field optional, at least one required. */
export const updateSourceSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(200),
    url: httpsUrl,
    trustedFor: z.array(z.enum(FOOD_PROPERTIES)).max(FOOD_PROPERTIES.length),
    useAs: z.enum(SOURCE_USES),
    notes: z.string().trim().max(2000).nullable(),
    isActive: z.boolean(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");

/** True when a database error is a unique-constraint violation (duplicate name). */
export function isDuplicateError(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string } } | null;
  return e?.code === "23505" || e?.cause?.code === "23505";
}
