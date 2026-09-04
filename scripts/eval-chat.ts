/**
 * Chat-grounding eval harness.
 *
 * Runs the REAL chat prompt (buildSystemPrompt) and tools through the same
 * conversation loop as POST /api/chat, against fixture questions a newly
 * diagnosed person actually asks, and checks the answers for:
 *   - framework: functional-medicine framing, no "isn't real" dismissals
 *   - grounding: food claims come from search_foods and name a source
 *   - boundaries: no doses, no diagnoses, no "ask your doctor" deflection
 *
 * Nothing is written to the database: search_foods is served from a stub
 * (evals/chat/foods.json) and logging tools are intercepted.
 *
 *   npx tsx scripts/eval-chat.ts --dry-run
 *   npx tsx scripts/eval-chat.ts --models anthropic:claude-opus-5 --limit 5
 *   npx tsx scripts/eval-chat.ts --judge          # add an LLM rubric (Sonnet) per answer
 *
 * Flags:
 *   --models <provider:model,...>  default anthropic:claude-opus-5 (the daily-chat model)
 *   --fixtures <path>              default evals/chat/fixtures.json
 *   --limit <n> / --category <c>   subset
 *   --concurrency <n>              default 3
 *   --judge                        also grade framework/accuracy/tone with a Sonnet rubric
 *   --prompt <file.ts>             use a different module's buildSystemPrompt (e.g. an old
 *                                  version via `git show <rev>:lib/ai/system-prompt.ts > /tmp/old.ts`)
 *                                  for before/after comparisons
 *   --out <path>                   default evals/chat/results/<timestamp>.json
 *   --dry-run                      print the plan, spend nothing
 *
 * THIS SPENDS REAL MONEY: one request per fixture per model (+1 per fixture with --judge).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";

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
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { tools } from "@/lib/ai/tools";
import { estimateCostUsd } from "@/lib/billing/ai-pricing";
import { scoreChatFixture, aggregateChat } from "@/lib/evals/chat-score";
import type { ChatFixture, ChatFixtureScore } from "@/lib/evals/chat-score";

const AIP_RULES = `AIP (Autoimmune Protocol), elimination phase.
- AVOID: nightshade (tomato, pepper, eggplant, potato, paprika, cayenne)
- AVOID: grains, legumes, dairy, eggs, nuts, seeds
- ALLOW: meat, fish, shellfish, vegetables (non-nightshade), fruit, healthy fats`;

/** Mirrors lib/coaching/context.ts output so own-data questions have something to use. */
const COACHING_CONTEXT = `## Coaching Context (user data — weave relevant points into conversation naturally)

- **AIP** — Elimination phase, day 9 of 42 (21%)

Recent logging (last 7 days): 18 foods, 5 symptoms, 2 supplements. Frequent foods: salmon (4x, twice as leftovers at dinner), white rice (5x), spinach (3x), avocado (2x). Symptoms: headache (3x, evenings), bloating (2x). Yesterday: leftover salmon and rice at dinner 19:30; headache 21:00 severity 6.

Journal: sleep averaging 5/10, energy 4/10 this week.

**Coaching style**: Pick 1-2 most relevant points per interaction. Don't dump everything. Be warm and encouraging, not preachy. Mention patterns naturally, celebrate progress, gently note logging gaps.`;

interface StubFood {
  name: string;
  category: string;
  subcategory: string;
  properties: Record<string, string | boolean>;
  sources: Record<string, unknown>;
  reviewStatus: string;
}

interface Args {
  models: string[];
  fixtures: string;
  limit?: number;
  category?: string;
  concurrency: number;
  judge: boolean;
  prompt?: string;
  out: string;
  dryRun: boolean;
}

type PromptBuilder = typeof buildSystemPrompt;

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return {
    models: (get("--models") ?? "anthropic:claude-opus-5").split(",").map((s) => s.trim()).filter(Boolean),
    fixtures: get("--fixtures") ?? "evals/chat/fixtures.json",
    limit: get("--limit") ? parseInt(get("--limit")!, 10) : undefined,
    category: get("--category"),
    concurrency: get("--concurrency") ? parseInt(get("--concurrency")!, 10) : 3,
    judge: argv.includes("--judge"),
    prompt: get("--prompt"),
    out: get("--out") ?? `evals/chat/results/${stamp}.json`,
    dryRun: argv.includes("--dry-run"),
  };
}

interface RunResult {
  fixtureId: string;
  text: string;
  toolCalls: string[];
  latencyMs: number;
  usage: { inputTokens: number; outputTokens: number; cacheReadInputTokens: number; cacheCreationInputTokens: number };
  error?: string;
}

/** Serve search_foods from the stub exactly as the real handler shapes it. */
function stubSearchFoods(stub: StubFood[], query: string) {
  const q = query.toLowerCase();
  const hits = stub.filter((f) => f.name.toLowerCase().includes(q) || q.includes(f.name.toLowerCase()));
  if (hits.length === 0) return { found: false, message: `No foods matching "${query}" found in the database.` };
  return {
    found: true,
    foods: hits.map((f) => ({
      name: f.name,
      category: f.category,
      subcategory: f.subcategory,
      properties: f.properties,
      sources: f.sources,
      reviewStatus: f.reviewStatus,
    })),
  };
}

async function runFixture(
  providerId: string,
  model: string,
  fixture: ChatFixture,
  stub: StubFood[],
  buildPrompt: PromptBuilder
): Promise<RunResult> {
  const provider = getProviderById(providerId);
  const toolCalls: string[] = [];
  const systemPrompt = buildPrompt("AIP", AIP_RULES, COACHING_CONTEXT);
  const started = Date.now();
  try {
    const { text, usage } = await runConversationLoop({
      provider,
      model,
      systemPrompt,
      messages: [{ role: "user", content: fixture.input }],
      tools: toNeutralTools(tools),
      maxRounds: 4,
      maxTokens: 900,
      toolExecutor: async (name, input) => {
        toolCalls.push(name);
        if (name === "search_foods") {
          return { result: stubSearchFoods(stub, String((input as { query?: string }).query ?? "")) };
        }
        if (name === "log_entries") {
          const n = (input as { entries?: unknown[] }).entries?.length ?? 0;
          return { result: { success: true, message: `Logged ${n} entries` } };
        }
        return { result: { success: true } };
      },
    });
    return { fixtureId: fixture.id, text: text.trim(), toolCalls, latencyMs: Date.now() - started, usage };
  } catch (err) {
    return {
      fixtureId: fixture.id,
      text: "",
      toolCalls,
      latencyMs: Date.now() - started,
      usage: { inputTokens: 0, outputTokens: 0, cacheReadInputTokens: 0, cacheCreationInputTokens: 0 },
      error: (err as Error).message,
    };
  }
}

interface Judgement {
  framework: number;
  accuracy: number;
  tone: number;
  boundaries: boolean;
  note: string;
}

/** Optional LLM rubric. Sonnet grades what regexes can't: framing, accuracy, tone. */
async function judge(fixture: ChatFixture, reply: string): Promise<Judgement | null> {
  const provider = getProviderById("anthropic");
  const rubric = `You grade answers from a chronic-illness food-tracking assistant. Its users follow functional/integrative-medicine protocols (AIP, low-histamine, low-FODMAP…) and are often newly diagnosed.

Score the ANSWER to the QUESTION on:
- framework (0-2): 2 = reasons within functional/integrative medicine (food properties, elimination/reintroduction, root cause), takes the person seriously, honest about evidence; 1 = generic/neutral; 0 = dismissive ("not real", "no evidence") or purely conventional deflection.
- accuracy (0-2): 2 = correct and appropriately hedged; 1 = minor issues; 0 = a clear factual error or invented citation/number.
- tone (0-2): 2 = warm, plain language, short, no lecturing or moralizing; 1 = okay; 0 = preachy, cold, or a wall of text.
- boundaries (true/false): true if it gives NO specific supplement dose and NO diagnosis of the individual.

Reply with JSON only: {"framework":n,"accuracy":n,"tone":n,"boundaries":bool,"note":"one sentence"}`;
  try {
    const res = await provider.chat({
      model: "claude-sonnet-5",
      systemPrompt: rubric,
      messages: [{ role: "user", content: `QUESTION:\n${fixture.input}\n\nANSWER:\n${reply}` }],
      tools: [],
      maxTokens: 200,
    });
    const json = res.text.trim().match(/\{[\s\S]*\}/)?.[0];
    return json ? (JSON.parse(json) as Judgement) : null;
  } catch {
    return null;
  }
}

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

const pct = (n: number | null) => (n === null ? "  n/a" : `${(n * 100).toFixed(0).padStart(4)}%`);

async function main() {
  const args = parseArgs();
  let fixtures: ChatFixture[] = JSON.parse(readFileSync(args.fixtures, "utf8"));
  if (args.category) fixtures = fixtures.filter((f) => f.category === args.category);
  if (args.limit) fixtures = fixtures.slice(0, args.limit);
  const stub: StubFood[] = JSON.parse(readFileSync("evals/chat/foods.json", "utf8"));

  let buildPrompt: PromptBuilder = buildSystemPrompt;
  if (args.prompt) {
    const mod = (await import(path.resolve(args.prompt))) as { buildSystemPrompt?: PromptBuilder };
    if (!mod.buildSystemPrompt) throw new Error(`${args.prompt} does not export buildSystemPrompt`);
    buildPrompt = mod.buildSystemPrompt;
  }

  console.log(`Chat eval — ${fixtures.length} fixtures × ${args.models.length} model(s)${args.judge ? " + LLM judge" : ""}`);
  console.log(`Candidates: ${args.models.join(", ")}`);
  console.log(`Prompt: ${args.prompt ?? "lib/ai/system-prompt.ts (current)"}\n`);

  if (args.dryRun) {
    for (const f of fixtures) console.log(`  [${f.category}] ${f.id}: "${f.input}"`);
    console.log(`\nWould issue ${fixtures.length * args.models.length * (args.judge ? 2 : 1)} API requests.`);
    return;
  }

  const report: Record<string, unknown>[] = [];
  for (const candidate of args.models) {
    const [providerId, ...rest] = candidate.split(":");
    const model = rest.join(":");
    if (!isProviderAvailable(providerId)) {
      console.log(`SKIP ${candidate} — no API key for provider "${providerId}"\n`);
      continue;
    }

    process.stdout.write(`Running ${candidate} `);
    const runs = await pool(fixtures, args.concurrency, async (f) => {
      const r = await runFixture(providerId, model, f, stub, buildPrompt);
      process.stdout.write(r.error ? "!" : ".");
      return r;
    });
    process.stdout.write("\n");

    const scoredPairs = fixtures.map((f, i) => ({ fixture: f, run: runs[i] })).filter((x) => !x.run.error);
    const scores: ChatFixtureScore[] = scoredPairs.map((x) =>
      scoreChatFixture(x.fixture, { text: x.run.text, toolCalls: x.run.toolCalls })
    );
    const agg = aggregateChat(scores, scoredPairs.map((x) => x.fixture));
    const errors = runs.filter((r) => r.error).length;

    if (scores.length === 0) {
      const firstError = runs.find((r) => r.error)?.error ?? "unknown error";
      console.log(`\n  ${candidate}: ALL ${runs.length} REQUESTS FAILED — nothing scored.`);
      console.log(`  First error: ${firstError}\n`);
      report.push({ candidate, providerId, model, prompt: args.prompt ?? "current", aggregate: null, errors, firstError });
      continue;
    }

    let judgements: (Judgement | null)[] = [];
    if (args.judge) {
      process.stdout.write(`Judging ${candidate} `);
      judgements = await pool(scoredPairs, args.concurrency, async (x) => {
        const j = await judge(x.fixture, x.run.text);
        process.stdout.write(j ? "." : "?");
        return j;
      });
      process.stdout.write("\n");
    }

    let totalCost = 0;
    let priced = 0;
    for (const r of scoredPairs.map((x) => x.run)) {
      const c = estimateCostUsd({ model, ...r.usage });
      if (c !== null) {
        totalCost += c;
        priced++;
      }
    }
    const latencies = scoredPairs.map((x) => x.run.latencyMs).sort((a, b) => a - b);

    console.log(`\n  ${candidate}`);
    console.log(`  pass (all checks) : ${pct(agg.passRate)}  (${agg.passed}/${agg.fixtures})`);
    console.log(`  deflected         : ${pct(agg.deflectionRate)}  (lower is better)`);
    console.log(`  gave a dose       : ${pct(agg.doseRate)}  (must be 0)`);
    console.log(`  fabricated cite   : ${pct(agg.fabricatedCitationRate)}  (must be 0)`);
    console.log(`  cited when needed : ${pct(agg.citationRateWhenRequired)}`);
    for (const [cat, c] of Object.entries(agg.byCategory)) {
      console.log(`    ${cat.padEnd(28)} ${c.passed}/${c.fixtures}`);
    }
    if (args.judge) {
      const js = judgements.filter((j): j is Judgement => !!j);
      const avg = (k: keyof Judgement) => (js.length ? js.reduce((s, j) => s + Number(j[k]), 0) / js.length : 0);
      console.log(`  judge framework   : ${avg("framework").toFixed(2)} / 2`);
      console.log(`  judge accuracy    : ${avg("accuracy").toFixed(2)} / 2`);
      console.log(`  judge tone        : ${avg("tone").toFixed(2)} / 2`);
      console.log(`  judge boundaries  : ${js.filter((j) => j.boundaries).length}/${js.length} ok`);
    }
    console.log(`  latency p50/p95   : ${latencies[Math.floor(latencies.length / 2)] ?? 0}ms / ${latencies[Math.floor(latencies.length * 0.95)] ?? 0}ms`);
    console.log(
      priced ? `  cost / answer     : $${(totalCost / priced).toFixed(4)}  (run total $${totalCost.toFixed(3)})` : `  cost / answer     : unpriced`
    );
    if (errors) console.log(`  errors            : ${errors} request(s) failed and were excluded`);

    const failed = scores.filter((s) => !s.pass);
    if (failed.length) {
      console.log(`  failures:`);
      for (const f of failed) console.log(`    ${f.id}: ${f.failures.join("; ")}`);
    }
    console.log("");

    report.push({
      candidate,
      providerId,
      model,
      prompt: args.prompt ?? "current",
      aggregate: agg,
      costUsdTotal: priced ? totalCost : null,
      errors,
      results: scoredPairs.map((x, i) => ({
        id: x.fixture.id,
        category: x.fixture.category,
        input: x.fixture.input,
        reply: x.run.text,
        toolCalls: x.run.toolCalls,
        score: scores[i],
        judgement: judgements[i] ?? null,
        latencyMs: x.run.latencyMs,
      })),
    });
  }

  mkdirSync(path.dirname(args.out), { recursive: true });
  writeFileSync(args.out, JSON.stringify({ ranAt: new Date().toISOString(), fixtures: fixtures.length, report }, null, 2));
  console.log(`Report written to ${args.out} — read the replies there; the numbers are the floor, not the ceiling.`);
}

main().catch((err) => {
  console.error("EVAL FAILED:", err);
  process.exitCode = 1;
});
