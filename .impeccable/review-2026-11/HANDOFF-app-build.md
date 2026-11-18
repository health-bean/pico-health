# Hand-off: build the app on the new design system (2026-11-18)

Read this, then `DESIGN.md` (repo root), then `CLAUDE.md`. Together they are everything you need.

## The goal

Rebuild the app's screens so they follow `DESIGN.md`, which Dee signed off on 2026-11-18. The visual reference is page 2 of the community PDF (Dee loves it):

- `~/Desktop/Pico-Health-Community.pdf` (also `.impeccable/review-2026-11/pdf-final/Pico-Health-Community.pdf`)
- Mock with before/after: https://claude.ai/artifact/AfBCHVixhSD3ogta4hyJRP
- Exact CSS of the three boxes (colours, sizes, spacing to copy): `.impeccable/review-2026-11/pdf-final/boxes.html`
  - box 1 (`#b1`): Insights as "Possible trigger" (red) and "Worth watching" (amber) plain labels, % chip, sentence, contributing foods
  - box 2 (`#b2n`): a day as a running timeline: time column, one line, a dot per entry in its type colour, type tag, words
  - box 3 (`#b3n`): protocol pill(s) at the top, shared "Find a food" search, rows split by hairlines, ✓ Fits / − Limit badges, the reason attribute in the verdict colour, bigger • between attributes
- Colour decisions sheet: https://claude.ai/artifact/2TD8zDeGAJpCKRtVpPRoYE

## How Dee works (non-negotiable)

1. **One screen at a time.** Show it on a real phone-size screenshot (390px wide, real demo data) on a preview artifact, get her sign-off, then the next screen.
2. **Nothing goes to `main` (live) until she signs off.** Push the branch only. When she says ship, `git fetch && git rebase origin/main` then `git push origin HEAD:main` (Vercel deploys picohealth.app; she tests there, never on localhost).
3. **Don't do things she hasn't asked for.** If unsure what she means, ask one short question. Talk in plain words, not jargon.
4. **Accuracy is everything.** Every food fact must match the food database and protocol rules; every cause→symptom pairing must be factual. Check numbers against `/api/insights/patterns` and food facts against the DB (see "Tools") before showing anything.
5. **Do not touch** `components/landing/*` or `lib/landing-content.ts` (another window owns the marketing site). Write that window a brief instead (below).

## Where things are

- Worktree: `~/Coding/pico-health-redesign`, branch `feat/log-insights-redesign` (about 25 commits ahead of `main`, none shipped). Work here.
- Already **live** on `main`: the Log as a timeline, the colour pass to teal/ochre/brick (being replaced now), Insights one card per finding.
- On the **branch, not live** (Dee has seen and liked these; they ship with this build):
  - the food panel ("slider", `components/timeline/FoodSheet.tsx`): opens under the tapped food, "Your protocol / Your log / You / What's in it"
  - Insights: one card per cause with an "Also:" line; plain when-clauses ("On days you ate / took / were exposed to"; "After poor sleep")
  - Log: date bar pinned; a flagged food's name in its verdict colour; "Checked against your X protocol. No mark means allowed."
  - My food list: protocol name(s) under the title (`protocolsLabel`)
  - The app ground: cream fading to card white (`bg-app` in `app/globals.css`), cream-tinted card shadow, borderless cards, 20px corners shared by cards and inputs, header and date bar clear at the top and solid on scroll (`hooks/use-scrolled.ts`)
- Still to change to meet DESIGN.md: everything below.

## Build order

1. **Tokens** (`app/globals.css` `@theme`): add the DESIGN.md colours (trigger red, watch amber, good green with tint/edge, cycle pink, supplement purple, food grey). Move every use onto them, then **delete** the retired names (`brick-*`, `ochre-*`, `olive-*`, any leftover `gold-*` in the app; keep `lp-*`, they are the marketing site's). Food fit lives in `FIT_TONE_CLASS` / `FitSymbol` (`lib/protocols/fit-line.ts`, `components/foods/FitSymbol.tsx`): Avoid red, Limit amber, Allowed **green** (not teal). Errors use red. Symptoms move from clay to red (clay `#BE5D0E` stays only as the burnt-orange brand label colour). Update `CLAUDE.md` if any rule changes.
2. **Log** (`app/(app)/log/page.tsx`, `components/timeline/*`): timeline dots and type tags in the entry-type colours (box 2); no boxes; verdicts and the reason attribute per the Verdict and Reason Rules.
3. **Food search + My food list** (`components/quick-log/FoodSearchInput.tsx`, `app/(app)/my-list/page.tsx`): one shared search; protocol pill(s) on top; every attribute in grey for everyone; colour only with a verdict, the reason in the verdict colour; rows not boxes where possible (box 3).
4. **Insights** (`app/(app)/insights/page.tsx`, `components/insights/*`): section labels "Possible trigger(s)" red, "Worth watching" amber, "Seems to help" green; findings as rows; no jargon (box 1).
5. **Food panel** (`FoodSheet.tsx`, `PersonalRatingPicker`): same colours and rules.
6. **Clean-up** after each screen: delete unused components, exports, styles and tokens (check with `npx knip` or a grep for each export); `npx tsc --noEmit`, `npx eslint`, `npx vitest run` all green; add tests for changed logic.
7. **Ship** after Dee signs off every screen. Then retake real screenshots for the PDF and website (now fine in iPhone frames, since the app will match), and write the website brief.

## Tools

- Local production server (the dev server's Turbopack cache loops; use a build):
  `npx next build` then `DB_POOL_MAX=8 npx next start -p 3100` (the pooler allows 15 connections).
- Demo sign-in for screenshots: `node .impeccable/review-2026-11/scripts/link.js` prints a `/api/auth/callback?...` URL for demo@picohealth.app (admin magic link; Dee approved this for local screenshots of the demo account only; never expose the service key).
- Playwright: `playwright-core` with Chromium at `~/Library/Caches/ms-playwright/chromium-1140/chrome-mac/Chromium.app/Contents/MacOS/Chromium`, viewport 390×844, deviceScaleFactor 3. Capture scripts to copy from: `.impeccable/review-2026-11/scripts/` (`final.js`, `card2top.js`, `card3.js`, `ins2.js`, `dump.js`, `boxes.js`).
- Insights numbers: `dump.js` fetches `/api/insights/patterns?days=90`. The insights cache is in-process locally: restart `next start` after reseeding.
- Database (read-only checks, reseeding the demo): `npx vercel env pull <scratchpad>/pico.env --environment=production --yes` from `~/Coding/pico-health`, `set -a && source` it, delete it after. Fact-check script using the app's own protocol rules: `.impeccable/review-2026-11/scripts/factcheck.ts` (`npx tsx --tsconfig tsconfig.json …`).
- Demo data: `scripts/seed-demo-current.mjs` (force-added; `scripts/` is gitignored). Dry run by default, `--commit` to write; only touches demo@picohealth.app. Stories follow the facts: very-high-oxalate days (spinach, almonds, quinoa, sweet potato, green beans) → joint pain; histamine (leftovers, strawberry slips) → hives; mold → brain fog; magnesium → less fatigue. Yesterday is a fixed showcase day (spinach omelet → joint pain mid-morning; leftover lunch → hives).
- Design skill: `impeccable` (run its `context` once; detector: `~/.claude/skills/impeccable/scripts/impeccable detect --json`); accessibility: `axe-core@4.10.2` in Playwright (WCAG 2.2 AA, 0 violations is the bar).

## Known gaps to fix or flag

- Demo: after the last reseed, "Things that seem to help" is empty (magnesium dropped out). Tune `scripts/seed-demo-current.mjs` so magnesium → less fatigue returns, without inventing noise findings; recheck with `dump.js`.
- Food data: common foods unrated for histamine on Low Histamine (kale, cod, olive oil, salmon (fresh), sweet potato, quinoa); no lectin or salicylate ratings exist at all; "Cheddar Cheese" shows Allowed on Low Histamine (looks wrong). Flag for `/admin/foods`; don't invent ratings.
- Insights wording: "Also showed up on better days for severe hives" (the cross-note) confuses; rewrite in plain words.
- Ideas Dee likes, not built: saved/reusable meals; photo-a-meal benchmark. Don't show unbuilt features in marketing.

## Website brief (for the marketing window, after the app ships)

Swap the three "See it in action" cards in `components/landing/approach.tsx` for the PDF's three boxes (images: `~/Desktop/Pico-screens/website-cards-2026-11-18/`, CSS: `pdf-final/boxes.html`), and move the site's red/amber/green to the DESIGN.md values. The site's stat already reads "3 in 4 US adults live with a chronic condition" (CDC 2025); the PDF now matches it.
