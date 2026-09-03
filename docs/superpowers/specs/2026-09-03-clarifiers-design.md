# Clarifiers — Design (approved 2026-09-03)

Approved by Dee in conversation ("just build it"). Additive to the capture loop
(`2026-09-02-capture-loop-design.md`); changes no existing behavior.

## Why
For this audience the *detail* is the signal: "salmon" tells a low-histamine
user nothing, "leftover salmon" is the finding. Capture must stay a silent
10-second scribe, so questions are asked **after** save, one at a time, and
only when they change what the insights engine can learn.

## Decisions
- **Deterministic, not AI.** The model only extracts. Which question to ask is a
  lookup: `food properties × user protocol × user history → one clarifier`.
  Same inputs → same question, for every user.
- **v1 dimensions:** `preparation` (fresh/leftover/fermented/aged/canned),
  `quantity` (less/usual/more — never grams), `additions` (spices, onion/garlic,
  cooking oil). Ripeness and cooking method deferred.
- **Surfaces:** result card (one question, skippable) and Reflect ("fill in the
  blanks", ≤3). Chat untouched. Timeline card shows answers as metadata and the
  "Meal or time" editor lets them be corrected.
- **Relevance:** if the user has a protocol, ask only about axes the protocol
  restricts (property rules with status avoid/moderation). No protocol → any
  axis where the food is high/very_high.
- **Limits:** one question per capture card; ≤3 recorded responses per day;
  never re-ask a food+dimension once answered; a skip is suppressed after the
  second time. Chips only, no free text.
- **Rules live in code** (`lib/clarifiers/rules.ts`), shaped as data so they can
  move to a table later without changing the engine interface.

## Data
- Answers are written into `timeline_entries.structured_content`
  (`preparation[]`, `quantity`, `additions[]`) exactly like `preparation` is
  today. `fresh` is an explicit preparation value so "answered" ≠ "unanswered".
- New table `clarifier_responses (user_id, food_id, dimension, answer,
  answer_count, skip_count, last_at)` unique on `(user_id, food_id, dimension)`.
  Powers "don't ask twice", skip suppression, and per-dimension defaults
  ("you usually say olive oil").

## Engine
`selectClarifier(input) → Clarifier | null` in `lib/clarifiers/engine.ts` —
pure, unit-tested. Filter rules by axis relevance → drop rules whose field is
already filled → drop answered / skipped≥2 → drop if daily cap hit → return the
first by fixed priority (preparation → quantity → additions).

## API
- `GET /api/clarifiers?entryIds=a,b` → `{ clarifiers: Clarifier[] }`
- `GET /api/clarifiers/pending?date=YYYY-MM-DD` → up to 3
- `POST /api/clarifiers/answer { entryId, dimension, answer | "skipped" }`
All routes: `getSessionFromCookies()`, Zod, `userId`-scoped Drizzle,
insights cache invalidation on answer.

## Insights
`FoodEntry` gains `quantity?` and `additions?`; `single-factor` emits
`quantity:more`, `additions:garlic`, … as factors like `preparation:leftover`.

## Non-goals (v1)
Chat surface, free text, grams, ripeness/cooking method, admin rules UI,
changes to the extraction prompt.
