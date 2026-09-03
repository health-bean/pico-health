import type { AITask } from "./providers/types";
import type { AIProvider } from "./providers/types";
import { getProviderById, isProviderAvailable } from "./providers/registry";

/**
 * Default routing: which provider handles which task.
 *
 * Override any route via env vars:
 *   AI_ROUTER_DAILY_CHAT=anthropic
 *   AI_ROUTER_HEALTH_INSIGHTS=gemini
 */
// All tasks route to Anthropic (decision 2026-09-03: single AI provider,
// single privacy story). Gemini remains env-switchable per task if ever needed.
const DEFAULT_ROUTING: Record<AITask, string> = {
  "daily-chat":          "anthropic",
  "capture-extract":     "anthropic",
  "food-photo-parse":    "anthropic",
  "admin-chat":          "anthropic",
  "health-insights":     "anthropic",
  "protocol-reasoning":  "anthropic",
};

const FALLBACK_PROVIDER = "anthropic";

/**
 * Strongest-model-per-task (decision 2026-09-04). "Strongest" includes speed
 * where the UX is latency-critical: capture must stream chips in ~2s, so it
 * runs Sonnet 5 (strong + fast); everything where judgment matters runs Opus 5.
 * Pricing per MTok in/out as of 2026-09: opus-5 $5/$25 · sonnet-5 $2/$10 ·
 * haiku-4-5 $1/$5 (the cost step-down if unit economics ever demand it).
 * Override any task via env: AI_MODEL_CAPTURE_EXTRACT=claude-opus-5.
 * Global override (all tasks): ANTHROPIC_MODEL.
 */
const DEFAULT_MODELS: Record<AITask, string> = {
  "daily-chat":          "claude-opus-5",
  "capture-extract":     "claude-sonnet-5",
  "food-photo-parse":    "claude-sonnet-5",
  "admin-chat":          "claude-opus-5",
  "health-insights":     "claude-opus-5",
  "protocol-reasoning":  "claude-opus-5",
};

function modelEnvKeyForTask(task: AITask): string {
  return `AI_MODEL_${task.toUpperCase().replace(/-/g, "_")}`;
}

/** The model a task should run on (env override > global override > tier default). */
export function getTaskModel(task: AITask): string {
  return (
    process.env[modelEnvKeyForTask(task)] ??
    process.env.ANTHROPIC_MODEL ??
    DEFAULT_MODELS[task]
  );
}

function envKeyForTask(task: AITask): string {
  return `AI_ROUTER_${task.toUpperCase().replace(/-/g, "_")}`;
}

/**
 * Get the configured provider for a given task.
 * Falls back if the primary provider is unavailable (no API key).
 */
export function getProvider(task: AITask): AIProvider {
  // Check env override first
  const envOverride = process.env[envKeyForTask(task)];
  const primaryId = envOverride ?? DEFAULT_ROUTING[task];

  if (isProviderAvailable(primaryId)) {
    return getProviderById(primaryId);
  }

  // Fallback
  if (primaryId !== FALLBACK_PROVIDER && isProviderAvailable(FALLBACK_PROVIDER)) {
    console.warn(
      `[ai-router] Provider "${primaryId}" unavailable for task "${task}", falling back to "${FALLBACK_PROVIDER}"`
    );
    return getProviderById(FALLBACK_PROVIDER);
  }

  // Try any available provider
  for (const id of Object.values(DEFAULT_ROUTING)) {
    if (isProviderAvailable(id)) {
      console.warn(
        `[ai-router] Falling back to "${id}" for task "${task}"`
      );
      return getProviderById(id);
    }
  }

  throw new Error(
    `No AI provider available for task "${task}". Set ANTHROPIC_API_KEY.`
  );
}
