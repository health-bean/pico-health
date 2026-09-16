# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

(One design language everywhere. Capacitor wraps picohealth.app for an iOS App Store build soon after launch, and possibly Google Play; those builds are the web app in a shell, not native designs. Decided 2026-09-16: native-feel store apps are not a goal before launch; revisit only if store review or user evidence demands it.)

## Users

- **Primary: the self-directed chronic-illness patient.** Managing autoimmune, gut, histamine, or other complex conditions on a healing protocol (AIP, elimination, low-FODMAP, low-histamine…). Often dealing with brain fog, fatigue, and anxiety about food. Found the app themselves; nobody is making them track. They must feel value within days or they churn.
- **Secondary: the practitioner-referred patient.** Told by a functional-medicine practitioner to "track everything for 30 days." Motivated by the mandate; needs visible progress against it and output they can share back. Served by the same capture loop with a framing layer (day-N progress strip, export), not a separate path (decided 2026-09-02).
- **Future: the practitioner** (B2B tier). No practitioner surface or role exists yet, only admin; specs live in `docs/superpowers/specs/2026-04-11-personal-data-store-design.md`.

## Product Purpose

Help people with chronic illness discover which foods, food properties, and lifestyle factors correlate with their symptoms, and navigate healing protocols with confidence. Success = a user logs consistently enough (≈14 days) for the insights engine to surface real patterns, and acts on them with their practitioner.

## Positioning

The only tracker that correlates at the **food-property level** (histamine, oxalate, FODMAP, lectin, nightshade… 14 properties on a curated, cited food database) rather than just foods or macros, combined with built-in intelligence for 9 healing protocols. Competitors (mySymptoms, Cara Care, Bearable) correlate individual foods at best; generic trackers (MyFitnessPal, Cronometer) count macros and know nothing about protocols. Register: **observe, don't prescribe** — no judgments, no scores, no lecturing (per Insights v2 spec).

## Operating Context

- Logging happens 3+ times a day, often on a phone, often while tired or foggy — sometimes at night, backfilling the day.
- Meals are mostly home-cooked whole foods (protocol constraint), which is why database/barcode-first competitors fail this audience.
- Users may bring a practitioner mandate ("track for 30 days") and export data to appointments.
- Tabs: **Log** (home, persistent capture bar), Chat (coaching and questions, functional-medicine framing, grounded in the food database), Reflect, Insights, Settings. Reintroduction trials are a distinct workflow (test a food back in over days).
- Progress for chronic conditions is framed as observation over time, not a score to win (Insights "progress" reframed 2026-09-15).

## Capabilities and Constraints

- **Built:** persistent capture bar with streaming AI extraction (text and photo), Quick Add sheet and shortcut row, deterministic post-save clarifiers, curated foods + USDA fan-out search, protocol compliance checking, Insights v2 engine (day composites, single/multi-factor, guarded stats, evidence-weighted ranking, honest denominators), Reflect daily scores, reintroductions, mandate progress strip, CSV export, Stripe billing plumbing (no checkout button yet), Terms and Privacy pages.
- **AI (decided 2026-09-03):** Anthropic only, single privacy story. Per-task routing in `lib/ai/router.ts`: `claude-sonnet-5` for capture extraction and food-photo parsing (speed-critical, ~2s chip streaming), `claude-opus-5` for chat, insights, protocol reasoning, and admin. Gemini code remains dormant and env-switchable; nothing routes to it. Every call is metered in `usage_log`; `/admin/usage` shows cost per user/task/day. Model changes are evaluated first with `npm run eval:capture` (55 fixtures).
- **Capture decisions (2026-09-02):** v1 modalities are **text and photo**; voice deferred to v1.1; **no barcode** in v1 (packaged foods go through search/custom foods; ingredient→property mapping for packaged goods is out of scope until post-launch demand shows).
- **Clarifiers (approved 2026-09-03):** capture stays a silent scribe; one deterministic follow-up question is asked after save (preparation, quantity as less/usual/more, additions), only when it changes what insights can learn. Lookup, not AI. ≤1 per capture card, ≤3 recorded per day, also surfaced in Reflect as "fill in the blanks."
- **Chat's role (decided 2026-09-02):** capture lives on the home screen; Chat is conversation/coaching, no longer the front door for logging.
- **Food data provenance:** each property carries sources and a `reviewStatus` (`unreviewed` | `ai_proposed` | `founder_set` | `practitioner_reviewed`). AI-agent writes without a citation are rejected. Entries may carry `preparation` tags (leftover, fermented, aged, cured, canned, smoked, dried, raw) surfaced as insight factors independent of the food.
- RLS does not protect Drizzle queries; every query must filter by `session.userId`.
- Entry types: food, symptom, supplement, medication, exposure, detox, exercise, energy, off_protocol.
- **Undecided:** consumer pricing (docs conflict: $1.99–3.99 vs $15–25/mo; billing plumbing exists, checkout does not); practitioner dashboard timing; push notifications (no device_tokens table yet); dark mode (deferred, forced light); exact store-submission timing ("soon after launch"). Pending before App Store submission: counsel review of Terms/Privacy, and a real support@picohealth.app mailbox (referenced in Terms, Privacy, Settings).

## Brand Commitments

- Name: **Pico Health** (rebranded from ChewIQ, 2026-04). Domain picohealth.app. Operated by **Health Bean LLC** (named in Terms and Privacy, 2026-09-04).
- Design system: **"Botanical Clinical"** — teal (hue 195) + warm neutrals (hue 80), Source Sans 3 body, Fraunces display, 14 primitives in `components/ui/`, Lucide icons, 44px touch targets, zero off-system colors, zero inline styles. This is the incumbent visual world and is preserved, not replaced.
- Voice: warm, curious, non-judgmental. Never lecture about off-protocol eating. Candidate headline (unconfirmed, reaffirmed as a candidate 2026-09-16): "Stop guessing. Start knowing." Current login subline: "Sign in to continue your healing journey."
- Legal register: medical disclaimer and AI-processing disclosure appear in Terms, Privacy, and Settings; product copy must not imply diagnosis or treatment.

## Evidence on Hand

- 320 curated foods with clinical trigger properties, each property cited against SIGHI, RPAH, Harvard-TLO, or published FODMAP lists. All are `ai_proposed`; **none has been practitioner-reviewed yet**, so copy must not claim clinical review. Curation queue at `/admin/foods` ranks gaps by real log volume.
- USDA FoodData Central integration (380K foods).
- 9 built-in protocols with phases and rules.
- Demo account (demo@picohealth.app) with 60 days of seeded AIP data containing known trigger relationships (`scripts/seed-demo-data.sql`, local only).
- Capture-extraction eval harness: 55 real-data fixtures (`evals/README.md`).
- No testimonials, case studies, published outcomes, or paying users yet — do not fabricate any.

## Product Principles

1. **The capture loop is the product.** If logging isn't fast enough to do 90 times a month while foggy, nothing downstream matters.
2. **Observe, don't prescribe.** Patterns are observations with honest denominators ("on 4 of 6 days"), never verdicts or scores.
3. **Every mistake is reversible.** Auto-save with undo beats confirm dialogs; correction is one tap.
4. **Properties over calories.** The data model serves trigger discovery, not nutrition accounting.
5. **Designed for the foggy day.** Recognition over recall, one primary action per screen, personal history first.
6. **Detail is the signal, asked later.** Capture never interrupts; the one clarifier that matters comes after save.

## Accessibility & Inclusion

Audience-specific needs: brain fog and fatigue (low cognitive load, large targets, forgiving flows), possible tremor/pain (44px minimum targets already in the system). Restore pinch-zoom (still disabled via `maximumScale: 1` in `app/layout.tsx` as of 2026-09-16 — known defect). Forced light mode is a known limitation.
