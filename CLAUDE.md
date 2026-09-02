# Pico Health

## Stack
Next.js 16 (App Router), React 19, Tailwind 4, Supabase (auth + DB), Drizzle ORM, Capacitor (iOS/Android), Stripe billing, Anthropic SDK, Zod validation, Upstash Redis (rate limiting)

## Commands
- `npm run dev` — local dev server (Turbopack)
- `npm run build` — production build
- `npm test` — run vitest
- `npm run lint` — eslint (flat config in eslint.config.mjs)
- DB-backed integration tests are skipped unless `RUN_DB_TESTS=1` is set (they need a real Postgres)
- `npm run db:push` — push schema to Supabase
- `npm run db:generate` — generate Drizzle migrations

## Deploy
- Production: picohealth.app (Vercel, auto-deploys from main)
- Database: Supabase (hosted)
- Rate limiting: Upstash Redis

## Architecture
- App Router with route groups: `(app)` for authenticated pages, `(auth)` for login/signup
- Tab structure: Chat, Log, Reflect, Insights, Settings
- All API routes use `getSessionFromCookies()` for auth
- Supabase auth with middleware-level `getUser()` verification
- RLS enabled on all 25+ tables

## Design System — "Botanical Clinical"
- Teal (hue 195) + warm neutrals (hue 80)
- Source Sans 3 (body), Fraunces (display headings)
- 14 UI components in `components/ui/`
- Forced light mode (no dark mode yet)
- Zero off-system colors, zero inline styles

## Key Conventions
- API auth: `getSessionFromCookies()` in every route handler
- Validation: Zod schemas for all request bodies
- Database: Drizzle ORM, never raw SQL in route handlers
- Mobile: Capacitor wraps picohealth.app for native builds
- Row Level Security is enabled in Supabase but does NOT apply to Drizzle queries (they connect as the DB owner via DATABASE_URL). Every query MUST filter by `session.userId`; the route handler is the only line of defense.
- Entry types: food, symptom, supplement, medication, exposure, detox, exercise, energy, off_protocol (DB CHECK constraint + Zod enum must stay in sync)
- Home route for signed-in users is `/log` (login, root, onboarding, and header logo all agree)

## TODO
- Consider updating login/landing page headline to: "Stop guessing. Start knowing."
