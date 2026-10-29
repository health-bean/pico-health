---
target: Log + Insights (founder feedback)
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
target_identity: "file:/Users/health-bean/Coding/pico-health/app/(app)/insights/page.tsx"
target_fingerprint: "sha256:dcf84e7cf48a2830405c927619ecd8b6ffd1ba38301b76d548f756115218287d"
target_path: /Users/health-bean/Coding/pico-health/app/(app)/insights/page.tsx
timestamp: 2026-10-29T22-08-43Z
slug: app-app-insights-page-tsx
---
Method: dual-agent (A: design review · B: detector + live browser)

Target: Log + Insights (with Reflect sliders), founder feedback evaluated. Score 27/40.

Heuristics: 1 Status 3 · 2 Real world 2 (07:23:00 times, plot jargon, ~70 "low" chips) · 3 Control 3 · 4 Consistency 2 (3 chip shapes, % vs N of M) · 5 Error prevention 3 · 6 Recognition 3 · 7 Efficiency 3 · 8 Minimalist 2 (per-food cards; Insights first viewport has no finding) · 9 Recovery 3 · 10 Help 3.

Specificity: Insights specific (honest-denominator copy, clay/ochre/olive sections). Log generic CRUD card list.

Detector: CLI 0 findings. Browser overlay: /log 3 (gray-on-color 6.68:1 tone only, thin-border-wide-shadow, flat-type-hierarchy h2>h1, cream-palette, width transition); /insights 25 (24 gray-on-color incl. #756e62 on #fcf2d1 at 4.51:1, cream-palette); /reflect 7 (width transitions, nested-cards, cream-palette). Insights height 3293px; 62 "low <property>" chips; 0 cards in first viewport.

Priority issues:
- [P1] Insights opens on dot plot, first finding at viewport bottom; duplicate of rows; with/without encoded by near-identical teals; helper headlines as 0%. Fix: lead with findings; per-card mini comparison; plot to bottom or remove.
- [P1] Strength invisible (ConfidenceTag warm-200/100/transparent). Fix: level-ramp fill + 3-pip meter + word; clay hue for triggers; olive + down-arrow for helps. Not a literal red/yellow/green traffic light.
- [P1] One card per food on Log. Fix: one card per meal, foods as rows with own ⋯ (44px), one Show properties per meal; symptoms get distinct marker.
- [P1] Copy/logic vs observe-don't-prescribe: "Things that may be causing symptoms" under "not causes"; watch-list rows lack other-days baseline. Fix: retitle ("Often there before symptoms"); always show other-days rate.
- [P2] "Your day": ~75 low chips, raw times, duplicates Log nav. Fix: moderate+ only on level ramp, "Nothing notable" collapse, 7:23 AM format.

Founder points: (1) chips smaller/less round — agree (visual ~36px, radius-md, keep 44px hit area, token-level change); meal cards — agree. (2) cards per insight — agree, keep 3-per-section cap, never restore prescriptive copy or "79% confidence"; traffic light — push back, use ramp+meter+word; demote plot — agree; hide lows — strongly agree; early signals count — move to per-section "+N early signals". (3) Reintroductions link at top — agree; per-card "Test this food" only for excluded/avoided foods. (4) Reflect per-area colors — push back (decorative); new sliders fill teal when rated; don't start thumb at midpoint.

Personas: foggy backfiller (no symptom chips on past days; 6 foods = 3 screens); practitioner-referred first-timer (plot + 99 early signals before any sentence); food-anxious user (red "causing" + red pills + Test CTA pushes restriction).

Minor: crossed-utensils icon reads "forbidden"; helper row reads inverted; busy tag row; capture bar is the right single primary action; Show food properties link on every card.

Questions: Does "Your day" belong on Insights? Should early signals appear inline on Log? What would "strong evidence" look like as "enough to bring to your practitioner"?
