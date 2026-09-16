# Pico Health

Operated by **Health Bean LLC**.

## Stack
Next.js 16 (App Router), React 19, Tailwind 4, Supabase (auth + DB), Drizzle ORM, Capacitor (iOS/Android), Stripe billing, Anthropic SDK (Claude only — no other AI provider in production), Zod validation, Upstash Redis (rate limiting)

## Commands
- `npm run dev` — local dev server (Turbopack)
- `npm run build` — production build
- `npm test` — run vitest
- `npm run lint` — eslint (flat config in eslint.config.mjs)
- `npm run eval:capture` — capture-extraction model eval (see `evals/README.md`); needs a real `ANTHROPIC_API_KEY` in `.env.local`, not the Vercel one
- DB-backed integration tests are skipped unless `RUN_DB_TESTS=1` is set (they need a real Postgres)
- `npm run db:push` — push schema to Supabase
- `npm run db:generate` — generate Drizzle migrations

## Deploy
- Production: picohealth.app (Vercel, auto-deploys from main)
- Database: Supabase (hosted)
- Rate limiting: Upstash Redis
- AI: Anthropic only (`getProvider`/`getTaskModel` in `lib/ai/router.ts`); Gemini provider code remains in `lib/ai/providers/` as a dormant, env-switchable option but nothing routes to it by default
- Legal: `/terms`, `/privacy` (public, no auth) — operator Health Bean LLC, medical disclaimer, AI-processing disclosure

## Architecture
- App Router with route groups: `(app)` for authenticated pages, `(auth)` for login/signup
- Tab structure: **Log** (home — persistent capture bar), Chat (coaching/questions), Reflect, Insights, Settings
- The capture bar on Log (not Chat) is the primary logging surface — see `docs/superpowers/specs/2026-09-02-capture-loop-design.md` and `PRODUCT.md`
- All API routes use `getSessionFromCookies()` for auth
- Supabase auth with middleware-level `getUser()` verification
- Google OAuth: consent screen must be **Published** (not Testing) in Google Cloud Console, with app name/logo/privacy+terms URLs filled in, or Google shows the raw `*.supabase.co` callback host instead of "Pico Health" on the account picker. No code or custom-domain purchase needed — this is a console-only setting, confirmed working (2026-09-04).

## AI tasks and models
Per-task routing in `lib/ai/router.ts` (`getProvider(task)`, `getTaskModel(task)`), overridable via `AI_MODEL_<TASK>` env vars (e.g. `AI_MODEL_CAPTURE_EXTRACT=claude-opus-5`) or globally via `ANTHROPIC_MODEL`.

| Task | Default model | Why |
|---|---|---|
| `daily-chat` (Chat tab) | `claude-opus-5` | Coaching/reasoning — depth matters, volume is lower |
| `capture-extract` (capture bar text) | `claude-sonnet-5` | Speed-critical (~2s chip streaming); strongest *and* fast |
| `food-photo-parse` | `claude-sonnet-5` | Same speed constraint, vision |
| `health-insights`, `protocol-reasoning`, `admin-chat` | `claude-opus-5` | Low volume, quality-sensitive |

`claude-haiku-4-5` is documented as the cost step-down if unit economics ever demand it. Every AI call writes to `usage_log`; `/admin/usage` shows real cost per user/task/day. Prompt caching is on for system prompts.

To compare models/providers on real data before changing a default, use `npm run eval:capture` (`evals/README.md`) — 55 fixtures, drives the real capture pipeline with tool calls intercepted, no DB writes.

## Design System — "Botanical Clinical"
- Teal (hue 195) + warm neutrals (hue 80)
- Source Sans 3 (body), Fraunces (display headings)
- 14 UI components in `components/ui/`
- Forced light mode (no dark mode yet)
- Zero off-system colors, zero inline styles

## Data: food trigger properties
`food_trigger_properties` carries provenance: `sources` (per-property citations), `reviewStatus` (`unreviewed` | `ai_proposed` | `founder_set` | `practitioner_reviewed`), `reviewedBy`, `reviewedAt`. 320 curated foods (all currently `ai_proposed`, cited against SIGHI/RPAH/Harvard-TLO/published FODMAP lists), awaiting practitioner review. AI-agent property writes require a citation or are rejected; manual console edits are `founder_set`. Curation queue at `/admin/foods` (Needs curation tab) ranks missing-property foods by real log volume. See `docs/pico-health-admin-handbook` (also in Notion) for the review workflow.

## Key Conventions
- API auth: `getSessionFromCookies()` in every route handler
- Validation: Zod schemas for all request bodies
- Database: Drizzle ORM, never raw SQL in route handlers
- Mobile: Capacitor wraps picohealth.app for native builds
- Row Level Security is enabled in Supabase but does NOT apply to Drizzle queries (they connect as the DB owner via DATABASE_URL). Every query MUST filter by `session.userId`; the route handler is the only line of defense.
- Entry types: food, symptom, supplement, medication, exposure, detox, exercise, energy, off_protocol (DB CHECK constraint + Zod enum must stay in sync)
- Entries may carry `preparation` tags (leftover/fermented/aged/cured/canned/smoked/dried/raw) in `structuredContent`, surfaced as insight factors independent of the food itself
- Home route for signed-in users is `/log` (login, root, onboarding, and header logo all agree)

## TODO
- support@picohealth.app mailbox needs to exist (referenced in Terms/Privacy/Settings)
- Counsel review of /terms and /privacy before App Store submission
- Pricing decision (docs have historically disagreed: $1.99–3.99 vs $15–25/mo) — billing plumbing exists, checkout button does not
- Practitioner v0 (Personal Data Store spec) — no practitioner role/accounts yet, only admin
