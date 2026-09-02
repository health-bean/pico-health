# Capture Loop — Design Brief (confirmed 2026-09-02)

Confirmed by Dee via impeccable shape. PRODUCT.md is the product record; this brief governs the Phase 2 build.

## Job and audience
A person with chronic illness, likely tired or foggy, records a meal/symptom/supplement in under ten seconds, 3+ times a day, for weeks. Mode: Operate. The practitioner-referred user sees mandate progress ("day 12 of 30") through the same loop.

## Outcome and proof
Log from the home screen in one gesture (typed phrase or photo) → property-tagged food chips, saved with foodIds the insights engine can correlate, correctable in one tap. The day view visibly grows.

## Direction — "the ledger with an open pen"
- Home = Log day view + **persistent capture bar** docked above the tab bar: text field with rotating placeholder ("Salmon and rice for lunch…" / "Headache since 3pm…") + camera button. Always out; not a FAB or hidden sheet.
- **One field logs everything** (food, symptom, supplement, energy) via the existing extraction pipeline; food is the headline case. Meal type + time inferred from clock, editable chips on the result.
- Submit → **pending card inline in today's timeline**; chips stream in as extraction resolves; auto-save with 6s "Saved · Undo". Tap chip to edit; wrong food swaps via inline search.
- **Photo:** camera button → capture/pick → same pending card via Gemini vision. Permission denied → text fallback with gentle note.
- **Focus state:** shortcut row above keyboard — "Same as yesterday's breakfast", recent meals, top personal symptoms. Day 3 faster than day 1.
- **Mandate layer:** slim progress strip atop day view — default "Day 9 — patterns typically appear around day 14"; with a tracking goal set, "Day 12 of 30" + one-tap export. Same component, two framings.
- Chat tab = questions/coaching only. Quick Add sheet stays as structured fallback behind a "browse" affordance in the bar.

## Scope (confirmed)
- **v1: text + photo.** Voice v1.1. **No barcode** (packaged foods via search/custom food). Offline queue = nice-to-have, cut if expensive.
- Screens: home (day view + bar + strip), pending/result card, photo flow, shortcut row, day-1 empty state (capture bar is the hero; kill "Go to Chat").
- Untouched: Reflect, Insights, Settings, admin, Botanical Clinical tokens/primitives, extraction API contract (extend, don't replace).
- Anti-goals: no portion/calorie capture, no gamification streaks, no new colors, no red warnings on the result card.

## States
Empty day 1 · typical (3–6 entries) · heavy (15+; bar must not fight scroll). Extraction: streaming success · partial ("2 foods + something I didn't catch" → clarify in Chat) · failure (→ search prefilled with the text) · offline. Photo: granted / denied / poor image.

## Interaction and layout
Today's entries are the page; bar is the footer instrument; strip is a whisper. iOS webview keyboard safety (Capacitor) is a known risk — test early. Correction inherits the Phase 1 delete/undo system.

## Constraints and open decisions
44px targets, forced light, zero off-system styles. Chips begin streaming < 2s (Gemini flash). Builder must not invent: shortcut ranking (start: yesterday's same meal, then frequency); off-protocol note on result card = yes, calm register ("Outside AIP phase 1 · nightshade"), never the red warning.

## Decisions log
- 2026-09-02: one loop, two framings (no separate referred-patient path).
- 2026-09-02: no barcode v1 (whole-food audience; ingredient→property mapping for packaged goods out of scope).
- 2026-09-02: Chat demoted; capture is home.
