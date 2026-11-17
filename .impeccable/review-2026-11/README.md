# Log + Insights review, Nov 2026

- `preview/index.html` is the source of the preview page Dee reviews and signs off:
  https://claude.ai/artifact/GViTVy6wm2jViG72ukJvGV
  Republish it with the Artifact tool (file_path = preview/index.html, root = preview/).
  Its "Everything we've decided" section is the source of truth for decisions.
- `insights-heading.html` is the heading and strength-options page (https://claude.ai/artifact/CG8u4uXVkN882isfbH9rTK).
- `scripts/` holds the Playwright screenshot scripts, run against the local dev server (`DB_POOL_MAX=8 npx next dev -p 3100`):
  - `shot.js`, `days.js`, `dayfull.js`, `extra.js`, `search.js`, `dayview.js` take 390px screenshots of the real app on the demo account
  - `a11y.js` runs the axe WCAG 2.2 AA scan; `mock.js`, `sheettest*.js` render and test the mockups
  - `link.js` signs in demo@picohealth.app with a one-off admin magic-link token from SUPABASE_SERVICE_ROLE_KEY (no email sent; approved by Dee 2026-11-16)
  - They need `playwright-core@1.47.2` and `axe-core@4.10.2` installed next to them, plus the cached Chromium 1140.
- Process: changes go on the preview page first; nothing ships until Dee signs off there.
