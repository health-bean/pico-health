/**
 * Anthropic list pricing per million tokens (MTok).
 *
 * NOTE: These prices are a point-in-time copy (2026-09) of Anthropic list
 * pricing and MUST be updated manually when Anthropic pricing changes.
 * Cache reads bill at 10% of the input rate; cache creation at 125%.
 */
export const MODEL_PRICING: Record<
  string,
  { inputPerMTok: number; outputPerMTok: number }
> = {
  "claude-opus-5": { inputPerMTok: 5, outputPerMTok: 25 },
  "claude-sonnet-5": { inputPerMTok: 2, outputPerMTok: 10 },
  "claude-haiku-4-5": { inputPerMTok: 1, outputPerMTok: 5 },
};

const MTOK = 1_000_000;
const CACHE_READ_MULTIPLIER = 0.1;
const CACHE_CREATION_MULTIPLIER = 1.25;

/**
 * Estimated cost in USD for one usage row (or a summed group of rows for
 * the same model — the formula is linear in token counts).
 *
 * Returns null for models missing from MODEL_PRICING: never guess a price;
 * the UI surfaces those rows as "unknown model" instead.
 */
export function estimateCostUsd(row: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
}): number | null {
  const pricing = MODEL_PRICING[row.model];
  if (!pricing) return null;

  return (
    (row.inputTokens * pricing.inputPerMTok +
      row.outputTokens * pricing.outputPerMTok +
      row.cacheReadInputTokens * pricing.inputPerMTok * CACHE_READ_MULTIPLIER +
      row.cacheCreationInputTokens *
        pricing.inputPerMTok *
        CACHE_CREATION_MULTIPLIER) /
    MTOK
  );
}
