/**
 * Capture-extraction eval harness.
 *
 * Runs the REAL capture pipeline (same system prompt, same tools, same
 * conversation loop as POST /api/capture) against a fixture set, across any
 * number of candidate models and providers, and scores the results.
 *
 * Nothing is written to the database: tool calls are intercepted in-process.
 *
 *   npx tsx scripts/eval-capture.ts --dry-run
 *   npx tsx scripts/eval-capture.ts --models anthropic:claude-sonnet-5,anthropic:claude-haiku-4-5
 *   npx tsx scripts/eval-capture.ts --models gemini:gemini-2.0-flash --limit 10
 *
 * Flags:
 *   --models <provider:model,...>  candidates to compare (default: the three Anthropic tiers)
 *   --fixtures <path>              default evals/capture/fixtures.json
 *   --limit <n>                    only the first N fixtures (smoke runs)
 *   --category <name>              only fixtures in one category
 *   --concurrency <n>              parallel requests per model (default 4)
 *   --protocol <none|aip>          include protocol rules in the prompt (default aip)
 *   --out <path>                   JSON report (default evals/capture/results/<timestamp>.json)
 *   --dry-run                      print the plan and spend nothing
 *
 * THIS SPENDS REAL MONEY: one API request per fixture per model.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";

// ── Load .env.local before importing anything that reads process.env ──
const envPath = path.join(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const value = m[2].replace(/^["']|["']$/g, "");
    if (!process.env[m[1]]) process.env[m[1]] = value;
  }
}

import { runConversationLoop, toNeutralTools } from "@/lib/ai/client";
import { getProviderById, isProviderAvailable } from "@/lib/ai/providers/registry";
import { buildCapturePrompt } from "@/lib/ai/capture-prompt";
import { tools } from "@/lib/ai/tools";
import { estimateCostUsd } from "@/lib/billing/ai-pricing";
import { scoreFixture, aggregate } from "@/lib/evals/capture-score";
import type { Fixture, ActualEntry, FixtureScore } from "@/lib/evals/capture-score";

const CAPTURE_TOOL_NAMES = new Set(["log_entries", "log_exercise"]);

/** Mirrors a real AIP user's prompt context so results transfer to production. */
const AIP_RULES = `AIP (Autoimmune Protocol), elimination phase.
- AVOID: nightshade (tomato, pepper, eggplant, potato, paprika, cayenne)
- AVOID: grains, legumes, dairy, eggs, nuts, seeds
- ALLOW: meat, fish, shellfish, vegetables (non-nightshade), fruit, healthy fats`;

interface Args {
  models: string[];
  fixtures: string;
  limit?: number;
  category?: string;
  concurrency: number;
  protocol: string;
  out: string;
  dryRun: boolean;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return {
    models: (get("--models") ?? "anthropic:claude-opus-5,anthropic:claude-sonnet-5,anthropic:claude-haiku-4-5")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    fixtures: get("--fixtures") ?? "evals/capture/fixtures.json",
    limit: get("--limit") ? parseInt(get("--limit")!, 10) : undefined,
    category: get("--category"),
    concurrency: get("--concurrency") ? parseInt(get("--concurrency")!, 10) : 4,
    protocol: get("--protocol") ?? "aip",
    out: get("--out") ?? `evals/capture/results/${stamp}.json`,
    dryRun: argv.includes("--dry-run"),
  };
}

interface RunResult {
  fixtureId: string;
  entries: ActualEntry[];
  note: string;
  latencyMs: number;
  usage: { inputTokens: number; outputTokens: number; cacheReadInputTokens: number; cacheCreationInputTokens: number };
  error?: string;
}

/** One fixture through the real pipeline; tool calls intercepted, nothing persisted. */
async function runFixture(providerId: string, model: string, fixture: Fixture, protocol: string): Promise<RunResult> {
  const provider = getProviderById(providerId);
  const collected: ActualEntry[] = [];
  const today = new Date().toISOString().split("T")[0];

  const systemPrompt = buildCapturePrompt({
    today,
    localTime: fixture.at,
    ...(protocol === "aip" ? { protocolName: "AIP", protocolRulesText: AIP_RULES } : {}),
  });

  const started = Date.now();
  try {
    const { text, usage } = await runConversationLoop({
      provider,
      model,
      systemPrompt,
      messages: [{ role: "user", content: fixture.input }],
      tools: toNeutralTools(tools.filter((t) => CAPTURE_TOOL_NAMES.has(t.name))),
      maxRounds: 3,
      maxTokens: 512,
      toolExecutor: async (name, input) => {
        if (name === "log_entries") {
          const parsed = input as { entries?: Array<Record<string, unknown>> };
          for (const e of parsed.entries ?? []) {
            collected.push({
              entryType: String(e.entry_type ?? ""),
              name: String(e.name ?? ""),
              severity: typeof e.severity === "number" ? e.severity : null,
              mealType: e.meal_type ? String(e.meal_type) : null,
              preparation: Array.isArray(e.preparation) ? (e.preparation as string[]) : [],
            });
          }
          return { result: { success: true, message: `Logged ${parsed.entries?.length ?? 0} entries` } };
        }
        if (name === "log_exercise") {
          const parsed = input as Record<string, unknown>;
          collected.push({
            entryType: "exercise",
            name: String(parsed.exercise_type ?? "exercise"),
            preparation: [],
          });
          return { result: { success: true, message: "Logged exercise" } };
        }
        return { result: { error: `Unknown tool: ${name}` } };
      },
    });
    return { fixtureId: fixture.id, entries: collected, note: text.trim(), latencyMs: Date.now() - started, usage };
  } catch (err) {
    return {
      fixtureId: fixture.id,
      entries: collected,
      note: "",
      latencyMs: Date.now() - started,
      usage: { inputTokens: 0, outputTokens: 0, cacheReadInputTokens: 0, cacheCreationInputTokens: 0 },
      error: (err as Error).message,
    };
  }
}

/** Bounded-concurrency map. */
async function pool<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

function pct(n: number | null): string {
  return n === null ? "  n/a" : `${(n * 100).toFixed(0).padStart(4)}%`;
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

async function main() {
  const args = parseArgs();

  let fixtures: Fixture[] = JSON.parse(readFileSync(args.fixtures, "utf8"));
  if (args.category) fixtures = fixtures.filter((f) => f.category === args.category);
  if (args.limit) fixtures = fixtures.slice(0, args.limit);

  console.log(`Capture eval — ${fixtures.length} fixtures × ${args.models.length} model(s)`);
  console.log(`Candidates: ${args.models.join(", ")}`);
  console.log(`Protocol context: ${args.protocol}\n`);

  if (args.dryRun) {
    console.log("DRY RUN — no API calls made. Fixtures that would run:");
    for (const f of fixtures.slice(0, 10)) console.log(`  [${f.category}] ${f.id}: "${f.input}"`);
    if (fixtures.length > 10) console.log(`  … and ${fixtures.length - 10} more`);
    console.log(`\nWould issue ${fixtures.length * args.models.length} API requests.`);
    return;
  }

  const report: Record<string, unknown>[] = [];

  for (const candidate of args.models) {
    const [providerId, ...rest] = candidate.split(":");
    const model = rest.join(":");
    if (!isProviderAvailable(providerId)) {
      console.log(`SKIP ${candidate} — no API key configured for provider "${providerId}"\n`);
      continue;
    }

    process.stdout.write(`Running ${candidate} `);
    const runs = await pool(fixtures, args.concurrency, async (f) => {
      const r = await runFixture(providerId, model, f, args.protocol);
      process.stdout.write(r.error ? "!" : ".");
      return r;
    });
    process.stdout.write("\n");

    // Errored requests are NOT scored: an API failure is an infrastructure
    // problem, and counting it as a wrong answer would look like a quality
    // regression. They are reported separately instead.
    const scored = fixtures
      .map((f, i) => ({ fixture: f, run: runs[i] }))
      .filter((x) => !x.run.error);
    const scores: FixtureScore[] = scored.map((x) => scoreFixture(x.fixture, x.run.entries));
    const agg = aggregate(scores);
    const errors = runs.filter((r) => r.error).length;

    if (scores.length === 0) {
      const firstError = runs.find((r) => r.error)?.error ?? "unknown error";
      console.log(`\n  ${candidate}: ALL ${runs.length} REQUESTS FAILED — nothing scored.`);
      console.log(`  First error: ${firstError}`);
      console.log(`  (Check the provider's API key in .env.local.)\n`);
      report.push({ candidate, providerId, model, aggregate: null, errors, firstError });
      continue;
    }

    let totalCost = 0;
    let pricedRuns = 0;
    for (const r of scored.map((x) => x.run)) {
      const c = estimateCostUsd({ model, ...r.usage });
      if (c !== null) {
        totalCost += c;
        pricedRuns++;
      }
    }
    // A model absent from MODEL_PRICING (e.g. a non-Anthropic candidate) is
    // reported as unpriced rather than silently counted as free.
    const costKnown = pricedRuns > 0;
    const latencies = runs.filter((r) => !r.error).map((r) => r.latencyMs);

    console.log(`\n  ${candidate}`);
    console.log(`  perfect captures : ${pct(agg.perfectRate)}  (${agg.perfect}/${agg.fixtures} scored)`);
    console.log(`  entry F1         : ${pct(agg.entryF1)}   (precision ${pct(agg.entryPrecision)}, recall ${pct(agg.entryRecall)})`);
    console.log(`  meal type        : ${pct(agg.mealTypeAccuracy)}`);
    console.log(`  preparation      : ${pct(agg.preparationAccuracy)}`);
    console.log(`  severity         : ${pct(agg.severityAccuracy)}`);
    console.log(`  hallucination    : ${pct(agg.hallucinationRate)}  (lower is better)`);
    console.log(`  latency p50/p95  : ${median(latencies)}ms / ${[...latencies].sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)] ?? 0}ms`);
    console.log(
      costKnown
        ? `  cost / capture   : $${(totalCost / pricedRuns).toFixed(5)}  (run total $${totalCost.toFixed(4)})`
        : `  cost / capture   : unpriced — add "${model}" to MODEL_PRICING in lib/billing/ai-pricing.ts`
    );
    if (errors > 0) console.log(`  errors           : ${errors} request(s) failed and were excluded from scoring`);

    const worst = scores.filter((s) => !s.perfect).slice(0, 5);
    if (worst.length > 0) {
      console.log(`  worst cases:`);
      for (const w of worst) {
        const bits = [
          w.missed.length ? `missed ${w.missed.join(", ")}` : "",
          w.extra.length ? `extra ${w.extra.join(", ")}` : "",
          w.forbidden.length ? `FORBIDDEN ${w.forbidden.join(", ")}` : "",
          w.mealTypeOk === false ? "wrong meal" : "",
          w.preparationOk === false ? "missed prep" : "",
          w.severityOk === false ? "wrong severity" : "",
        ].filter(Boolean);
        console.log(`    ${w.id}: ${bits.join("; ")}`);
      }
    }
    console.log("");

    report.push({
      candidate,
      providerId,
      model,
      aggregate: agg,
      costUsdTotal: costKnown ? totalCost : null,
      costUsdPerCapture: costKnown ? totalCost / pricedRuns : null,
      latencyP50Ms: median(latencies),
      errors,
      scores,
      runs: runs.map((r) => ({ ...r, entries: r.entries })),
    });
  }

  mkdirSync(path.dirname(args.out), { recursive: true });
  writeFileSync(args.out, JSON.stringify({ ranAt: new Date().toISOString(), fixtures: fixtures.length, report }, null, 2));
  console.log(`Report written to ${args.out}`);
}

main().catch((err) => {
  console.error("EVAL FAILED:", err);
  process.exitCode = 1;
});
