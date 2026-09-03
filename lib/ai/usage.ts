import { db } from "@/lib/db";
import { usageLog } from "@/lib/db/schema";
import { log } from "@/lib/logger";
import type { AITask } from "./providers/types";

interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens?: number;
  cacheCreationInputTokens?: number;
}

/**
 * Record one AI request's token usage. Fire-and-forget: cost accounting must
 * never fail or slow the user-facing request — await it with .catch or void it.
 */
export async function recordUsage(params: {
  userId: string;
  task: AITask;
  provider: string;
  model: string;
  usage: UsageTotals | undefined;
}): Promise<void> {
  const { usage } = params;
  if (!usage || (usage.inputTokens === 0 && usage.outputTokens === 0)) return;
  try {
    await db.insert(usageLog).values({
      userId: params.userId,
      task: params.task,
      provider: params.provider,
      model: params.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cacheReadInputTokens: usage.cacheReadInputTokens ?? 0,
      cacheCreationInputTokens: usage.cacheCreationInputTokens ?? 0,
    });
  } catch (err) {
    log.warn("failed to record AI usage", { error: err as Error });
  }
}
