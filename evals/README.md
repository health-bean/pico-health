# Evals

Measured answers to "which model is best for this job" — using Pico Health's own
data and its real pipeline, not vendor benchmarks.

## Capture extraction

The capture bar turns a typed sentence into structured entries. That is the
highest-volume AI call in the product and the one whose quality users feel
directly, so it gets a dedicated eval.

```bash
npm run eval:capture -- --dry-run                     # plan only, spends nothing
npm run eval:capture                                  # the three Anthropic tiers
npm run eval:capture -- --models anthropic:claude-sonnet-5 --limit 10
npm run eval:capture -- --models gemini:gemini-2.0-flash   # any provider in the registry
```

**This spends real money**: one API request per fixture per model. The default run
is 55 fixtures × 3 models = 165 requests (cents on Haiku/Sonnet, more on Opus).
Start with `--dry-run`, then `--limit`.

### What it runs

`scripts/eval-capture.ts` drives the **real** capture path — the same
`buildCapturePrompt`, the same `log_entries`/`log_exercise` tools, the same
conversation loop as `POST /api/capture`. Only the tool executor is swapped: tool
calls are captured in-process, so **nothing is written to the database** and no
user account is needed. Results therefore transfer to production behavior.

Prompts include AIP protocol context by default (`--protocol none` to omit), because
production prompts always carry a protocol.

### What it measures

| Metric | Meaning |
|---|---|
| **perfect captures** | The headline. Share of fixtures extracted completely correctly — nothing missed, nothing invented, meal type and preparation right. |
| entry F1 | Precision/recall over individual entries. |
| meal type | Correct meal inferred from wording or time of day. |
| preparation | `leftover` / `fermented` / `canned` etc. captured when stated or intrinsic. |
| severity | Symptom severity when the input implies a number. |
| **hallucination** | Share of fixtures that produced an entry that shouldn't exist. Lower is better; the `negation-and-traps` fixtures exist to provoke this. |
| latency p50/p95 | The capture bar promises chips in ~2s. Speed is part of quality here. |
| cost / capture | Real token counts through `lib/billing/ai-pricing.ts`. Models absent from that map report as *unpriced* rather than free. |

Per-model output ends with the five worst cases, so a regression names itself.
Full detail (every run, every score) lands in `evals/capture/results/<timestamp>.json`.

### Fixtures

`evals/capture/fixtures.json` — real-world capture phrasings with expected
extractions, grouped by `category`: `simple-meal`, `multi-item`, `symptom`,
`mixed`, `preparation`, `meal-inference`, `supplement-medication`,
`negation-and-traps`, `messy-real-world`.

Name matching is deliberately fuzzy (`lib/evals/capture-score.ts`): "salmon"
matches "baked salmon", plurals normalize. Fixtures should list only what a
careful human would *definitely* log — missing entries count against the model,
so ambiguity belongs in `notes`, not in `expect`.

**Add a fixture whenever a real capture goes wrong.** That is how this file stays
worth running: it becomes the regression suite for extraction quality.

### Reading the result

Judge cost per *completed* capture, not per request — a cheaper model that misses
an entry costs the user a correction, and costs you the trust. A model wins here
if it takes the perfect-capture rate up, or holds it while taking latency or cost
down.

To act on a result, change one env var — no code change:

```bash
AI_MODEL_CAPTURE_EXTRACT=claude-opus-5      # per task
AI_MODEL_FOOD_PHOTO_PARSE=claude-sonnet-5
```

`/admin/usage` then shows what that choice actually costs in production.
