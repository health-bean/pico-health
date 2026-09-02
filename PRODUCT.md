# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

(Capacitor wraps picohealth.app for iOS/Android shells; design language is web, not native.)

## Users

- **Primary: the self-directed chronic-illness patient.** Managing autoimmune, gut, histamine, or other complex conditions on a healing protocol (AIP, elimination, low-FODMAP, low-histamine…). Often dealing with brain fog, fatigue, and anxiety about food. Found the app themselves; nobody is making them track. They must feel value within days or they churn.
- **Secondary: the practitioner-referred patient.** Told by a functional-medicine practitioner to "track everything for 30 days." Motivated by the mandate; needs visible progress against it and output they can share back. Served by the same capture loop with a framing layer (day-N progress, export), not a separate path (decided 2026-09-02).
- **Future: the practitioner** (B2B tier). No practitioner surface exists yet; specs live in `docs/superpowers/specs/2026-04-11-personal-data-store-design.md`.

## Product Purpose

Help people with chronic illness discover which foods, food properties, and lifestyle factors correlate with their symptoms, and navigate healing protocols with confidence. Success = a user logs consistently enough (≈14 days) for the insights engine to surface real patterns, and acts on them with their practitioner.

## Positioning

The only tracker that correlates at the **food-property level** (histamine, oxalate, FODMAP, lectin, nightshade… 14 properties on a curated food database) rather than just foods or macros, combined with built-in intelligence for 9 healing protocols. Competitors (mySymptoms, Cara Care, Bearable) correlate individual foods at best; generic trackers (MyFitnessPal, Cronometer) count macros and know nothing about protocols. Register: **observe, don't prescribe** — no judgments, no scores, no lecturing (per Insights v2 spec).

## Operating Context

- Logging happens 3+ times a day, often on a phone, often while tired or foggy — sometimes at night, backfilling the day.
- Meals are mostly home-cooked whole foods (protocol constraint), which is why database/barcode-first competitors fail this audience.
- Users may bring a practitioner mandate ("track for 30 days") and export data to appointments.
- Tabs: Log (home), Chat, Reflect, Insights, Settings. Reintroduction trials are a distinct workflow (test a food back in over days).

## Capabilities and Constraints

- **Built:** AI chat extraction (streaming, tool-based, food-ID matching), curated foods + USDA fan-out search, protocol compliance checking, Insights v2 engine (day composites, single/multi-factor, guarded stats), Reflect daily scores, reintroductions, Stripe plumbing, CSV export.
- **AI:** provider abstraction (`lib/ai/router.ts`); Gemini for daily chat, Claude for insights/protocol reasoning; `food-photo-parse` task routed to Gemini but has no UI yet. Both providers accept images.
- **Capture decisions (2026-09-02):** v1 modalities are **text and photo**; voice deferred to v1.1; **no barcode** in v1 (packaged foods go through search/custom foods; ingredient→property mapping for packaged goods is out of scope until post-launch demand shows).
- **Chat's role (decided 2026-09-02):** capture lives on the home screen; Chat is demoted to conversation/coaching, no longer the front door for logging.
- RLS does not protect Drizzle queries; every query must filter by `session.userId`.
- Entry types: food, symptom, supplement, medication, exposure, detox, exercise, energy, off_protocol.
- **Undecided:** consumer pricing (docs conflict: $1.99–3.99 vs $15–25/mo); practitioner dashboard timing; push notifications (no device_tokens table yet); dark mode (deferred, forced light).

## Brand Commitments

- Name: **Pico Health** (rebranded from ChewIQ, 2026-04). Domain picohealth.app.
- Design system: **"Botanical Clinical"** — teal (hue 195) + warm neutrals (hue 80), Source Sans 3 body, Fraunces display, 14 primitives in `components/ui/`, Lucide icons, 44px touch targets, zero off-system colors, zero inline styles. This is the incumbent visual world and is preserved, not replaced.
- Voice: warm, curious, non-judgmental. Never lecture about off-protocol eating. Candidate headline: "Stop guessing. Start knowing."

## Evidence on Hand

- 195 curated foods with clinical trigger properties; USDA FoodData Central integration (380K foods).
- 9 built-in protocols with phases and rules.
- Demo account (demo@picohealth.app) with 60 days of seeded AIP data containing known trigger relationships (`scripts/seed-demo-data.sql`).
- No testimonials, case studies, or published outcomes yet — do not fabricate any.

## Product Principles

1. **The capture loop is the product.** If logging isn't fast enough to do 90 times a month while foggy, nothing downstream matters.
2. **Observe, don't prescribe.** Patterns are observations with honest denominators ("on 4 of 6 days"), never verdicts or scores.
3. **Every mistake is reversible.** Auto-save with undo beats confirm dialogs; correction is one tap.
4. **Properties over calories.** The data model serves trigger discovery, not nutrition accounting.
5. **Designed for the foggy day.** Recognition over recall, one primary action per screen, personal history first.

## Accessibility & Inclusion

Audience-specific needs: brain fog and fatigue (low cognitive load, large targets, forgiving flows), possible tremor/pain (44px minimum targets already in the system). Restore pinch-zoom (currently disabled via `maximumScale: 1` — known defect). Forced light mode is a known limitation.
