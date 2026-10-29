import { z } from "zod";

/** Referral codes are short neutral slugs like "seattle", never names. Anything else is dropped. */
export function normalizeRef(ref: unknown): string | null {
  if (typeof ref !== "string") return null;
  const r = ref.trim().toLowerCase();
  return /^[a-z0-9-]{1,40}$/.test(r) ? r : null;
}

export const waitlistSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  ref: z.unknown().optional().transform(normalizeRef),
});
