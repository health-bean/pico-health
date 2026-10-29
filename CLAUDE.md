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
- Supabase auth: `getSessionFromCookies()` verifies the JWT with `getClaims()` (never trust `getSession()` server-side — it is unverified cookie data); middleware calls `getUser()` to refresh, redirects pages to /login and returns 401 JSON for `/api/*` except `/api/auth/*`, `/api/cron/*`, `/api/billing/webhook`, `/api/waitlist` (`isPublicApiRoute` in `lib/supabase/middleware.ts`)
- Email signup uses the confirm-email flow (`supabase.auth.signUp` → link → `/api/auth/callback`, which accepts `?code=` or `?token_hash=&type=`). The signup API returns the same `{ ok, confirmationRequired }` for new and existing emails. Profiles are created by `ensureProfile()` (`lib/auth/profile.ts`, idempotent) in the callback and on password login — never at signup. Requires Supabase "Confirm email" ON and `<origin>/api/auth/callback` in the allowed Redirect URLs
- Google OAuth: consent screen must be **Published** (not Testing) in Google Cloud Console, with app name/logo/privacy+terms URLs filled in, or Google shows the raw `*.supabase.co` callback host instead of "Pico Health" on the account picker. No code or custom-domain purchase needed — this is a console-only setting, confirmed working (2026-09-04).

## AI tasks and models
Per-task routing in `lib/ai/router.ts` (`getProvider(task)`, `getTaskModel(task)`), overridable via `AI_MODEL_<TASK>` env vars (e.g. `AI_MODEL_CAPTURE_EXTRACT=claude-opus-5`) or globally via `ANTHROPIC_MODEL`.

| Task | Default model | Why |
|---|---|---|
| `daily-chat` (Chat tab) | `claude-opus-5` | Coaching/reasoning — depth matters, volume is lower |
| `capture-extract` (capture bar text) | `claude-sonnet-5` | Speed-critical (~2s chip streaming); strongest *and* fast |
| `food-photo-parse` | `claude-sonnet-5` | Same speed constraint, vision |
| `health-insights`, `protocol-reasoning`, `admin-chat` | `claude-opus-5` | Low volume, quality-sensitive |

Per-user AI limits (UTC days): `lib/billing/quota.ts` (pure) + `lib/billing/enforce-quota.ts` (`checkAiQuota` in chat/capture before any model call). Free tier = 5 coaching messages/day (`/api/chat` only; capture is not counted) and every tier has a daily estimated-cost ceiling (`FREE_/PAID_DAILY_AI_BUDGET_USD` in `lib/billing/tiers.ts`), also enforced between tool rounds via `beforeRound`. Admins are exempt but still rate-limited. AI rate limits are keyed by userId only and use `{ strict: true }` — in production without working Upstash they drop to `STRICT_FALLBACK_RATE_LIMIT` per instance instead of failing open. Usage is recorded in the stream's `finally` (partial rounds count), kept alive with `keepAliveUntil()`. The Anthropic client has `maxRetries: 0`; `conversation-loop`'s `withRetry` is the only retry layer.

`claude-haiku-4-5` is documented as the cost step-down if unit economics ever demand it. Every AI call writes to `usage_log`; `/admin/usage` shows real cost per user/task/day. Prompt caching is on for system prompts.

To compare models/providers on real data before changing a default, use `npm run eval:capture` (`evals/README.md`) — 55 fixtures, drives the real capture pipeline with tool calls intercepted, no DB writes.

## Design System — "Botanical Clinical"
- "pico" palette (from the pitch deck): cream surface (#FCF2D1), teal ramp (hue 189), warm neutrals, ochre for "watch" patterns — tokens in `@theme` in `app/globals.css`
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
- Pricing decision (docs have historically disagreed: $1.99–3.99 vs $15–25/mo) — billing plumbing exists, checkout button does not. iOS must use IAP unless launching free
- App Store / Play launch: living checklist at https://claude.ai/artifact/2viZjpRXm5kxoSyT8yNEGX. Blockers: Google OAuth fails inside the Capacitor webview, Sign in with Apple required, no `ios/` project, no POST_NOTIFICATIONS, Play needs a web account-deletion page
- Push check-in reminders are built but inert until credentials + a 15-min cron exist — see `docs/push-setup.md`
- Practitioner v0 (Personal Data Store spec) — no practitioner role/accounts yet, only admin
