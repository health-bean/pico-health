import { after } from "next/server";
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
 * Record one AI request's token usage. Never throws: cost accounting must not
 * break the user-facing request. Streaming routes await it in the stream's
 * `finally` (so partial/failed rounds are counted too) before closing, inside
 * a keepAliveUntil() window.
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

/**
 * Keep the serverless function alive until the returned `done` is called,
 * even if the client disconnects mid-stream (uses next/server `after`).
 * Call it in the route handler itself, before returning the stream.
 */
export function keepAliveUntil(): () => void {
  let done = () => {};
  const finished = new Promise<void>((resolve) => {
    done = resolve;
  });
  try {
    after(finished);
  } catch {
    // Outside a request scope (unit tests, scripts): nothing to keep alive.
  }
  return done;
}
