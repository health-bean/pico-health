---
name: Pico Health
description: A calm daily log for people on healing protocols; it checks every food against your protocol and shows the patterns in your own days.
colors:
  cream: "#FCF2D1"
  card-white: "#FFFDF6"
  deep-teal: "#173F42"
  teal: "#1C6B72"
  teal-ink: "#175451"
  burnt-orange: "#BE5D0E"
  gold: "#EAC757"
  ink: "#271F15"
  ink-body: "#4A3F33"
  ink-muted: "#6E6457"
  hairline: "#EEEAE2"
  trigger-red: "#A12623"
  trigger-red-tint: "#FBEDEC"
  trigger-red-edge: "#E9B8B5"
  watch-amber: "#9E5407"
  watch-amber-fill: "#C77A12"
  watch-amber-tint: "#FEF8E4"
  watch-amber-edge: "#F1DEA4"
  good-green: "#0E7C55"
  good-green-tint: "#EAFBF3"
  good-green-edge: "#A9E2C9"
  cycle-pink: "#C4145A"
  cycle-pink-tint: "#FDF0F4"
  cycle-pink-edge: "#F5BED3"
  supplement-purple: "#7A1FD6"
  supplement-purple-tint: "#F7F0FE"
  supplement-purple-edge: "#DAC2F8"
  food-grey: "#6E6457"
  food-grey-tint: "#F2EFEA"
  food-grey-edge: "#DCD5CA"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Source Sans 3, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.55
  title:
    fontFamily: "Source Sans 3, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.375
  body:
    fontFamily: "Source Sans 3, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Source Sans 3, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.3
rounded:
  chip: "7px"
  tile: "10px"
  card: "20px"
  pill: "999px"
spacing:
  gutter: "16px"
  row: "12px"
  section: "28px"
components:
  card:
    backgroundColor: "{colors.card-white}"
    rounded: "{rounded.card}"
    padding: "16px"
  search:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.card}"
    height: "44px"
  badge-fits:
    backgroundColor: "{colors.good-green-tint}"
    textColor: "{colors.good-green}"
    rounded: "{rounded.pill}"
  badge-limit:
    backgroundColor: "{colors.watch-amber-tint}"
    textColor: "{colors.watch-amber}"
    rounded: "{rounded.pill}"
  badge-avoid:
    backgroundColor: "{colors.trigger-red-tint}"
    textColor: "{colors.trigger-red}"
    rounded: "{rounded.pill}"
  protocol-pill:
    backgroundColor: "#E6F1EF"
    textColor: "{colors.teal-ink}"
    rounded: "{rounded.pill}"
  button-primary:
    backgroundColor: "{colors.teal}"
    textColor: "{colors.card-white}"
    rounded: "{rounded.card}"
    height: "44px"
---

# Design System: Pico Health

## Overview

**Creative North Star: "The Kitchen Notebook"**

Pico is the notebook a careful person keeps on the kitchen counter: what they ate, what they took, how they felt, written down plainly, with the important things marked in the margin. The page is warm and quiet. Marks are few, and every mark means something specific to *this* person: what their protocol says about a food, or what their own days have shown.

The screens are calm because people open them when they feel unwell. Structure comes from rows, thin lines and a running timeline, not from boxes. Colour is rare and earned; when it appears it carries one of a small set of meanings, always with a word and a symbol beside it.

**Key Characteristics:**
- Cream at the top of every screen, fading to a warm white; white cards lift on a soft cream-tinted shadow, never a border.
- Three meaning colours (red, amber, green), each always with a symbol (✕ − ✓) and a word.
- Entry types have their own quiet colours (pink cycle, purple supplement, warm-grey food).
- No box inside a box. Lists are rows split by hairlines; a day is a timeline.
- Plain words, counts first, never prescriptive.

## Colors

A warm cream page with deep teal ink for headlines, and a small, strict set of signal colours.

### Brand
- **Cream** (#FCF2D1): the page. Every screen starts in it at the top and fades to card white over 300px (`bg-app`).
- **Card White** (#FFFDF6): cards, the search field, sheets.
- **Deep Teal** (#173F42): headlines, the dark sign-up panel on marketing pages.
- **Teal** (#1C6B72) / **Teal Ink** (#175451): actions, links, selected states, the protocol pill. Teal is never a verdict.
- **Burnt Orange** (#BE5D0E): "Health" in the wordmark and small section labels on marketing pages.
- **Gold** (#EAC757): the marketing call to action only (the Early Access pill, the sign-up button).

### Meaning (verdicts and findings)
- **Trigger Red** (#A12623): a possible trigger; Avoid on your protocol; a symptom.
- **Watch Amber** (#9E5407 text, #C77A12 fills): worth watching; Limit on your protocol; an exposure.
- **Good Green** (#0E7C55): fits your protocol; seems to help.

### Entry types (the Log)
- **Cycle Pink** (#C4145A), **Supplement Purple** (#7A1FD6), **Food Grey** (#6E6457). Symptom uses Trigger Red, exposure uses Watch Amber.

### Neutral
- **Ink** (#271F15) titles, **Body Ink** (#4A3F33) sentences, **Muted Ink** (#6E6457) labels and attributes, **Hairline** (#EEEAE2) row dividers.

### Named Rules
**The Verdict Rule.** Colour on a food appears only when there is a verdict *for this person*: their protocol says Fits, Limit or Avoid, or they rated it themselves. Without a protocol, attributes are listed in grey and nothing is coloured.

**The Reason Rule.** The attribute that caused a verdict takes the verdict's colour ("Moderate histamine" in amber beside − Limit); every other attribute stays grey. With several protocols, each protocol colours its own reason, and the badge shows the strictest verdict.

**The Meaning-Not-Strength Rule.** Colour says what something is, never how strong it is. Strength is the count and the ●●○ dots. Never green for "a weak link".

**The Symbol Rule.** Every meaning colour travels with its symbol (✕ − ✓) and a word, so it reads without colour.

**The Teal-Is-Action Rule.** Teal means "tap this" or "this is Pico". It never means "good for you"; that is green.

## Typography

**Display Font:** Fraunces (with Georgia)
**Body Font:** Source Sans 3 (with system-ui)

**Character:** a warm, slightly old-fashioned serif for page titles over a clear, friendly sans for everything a person reads quickly.

### Hierarchy
- **Display** (Fraunces 600, 24px, tight tracking): page titles ("Insights", "My food list", "Yesterday").
- **Headline** (600, 18px): section headings ("Possible triggers"), in their meaning colour.
- **Title** (600, 16px): a finding or a food name.
- **Body** (400, 15px, max 65ch): sentences, counts.
- **Label** (600, 12px): tags, badges, small labels.

### Named Rules
**The Plain Words Rule.** No internal jargon on screen ("Property Pattern", "correlation"). Labels say what a person would say: "Possible trigger", "Worth watching", "Fits", "Limit".

**The Count-First Rule.** Numbers lead with the count ("on 14 of 15 days"); a percentage only sits beside its count or its comparison ("71%, vs 12% after other meals").

## Layout

Phone first, 390px wide, 16px side gutters, one column. A screen is a short stack of sections; each section is a heading and then rows. Rows are 12px apart vertically and split by a hairline. A day on the Log is a running timeline: times in a left column, one thin line through the day, a dot per entry in its type colour. Page titles stay pinned under the header while a long day scrolls; header and pinned bars are clear over the cream and turn solid once content passes under them. Every tap target is at least 44px.

## Elevation & Depth

Depth comes from the page fading from cream to white and from one soft shadow. Cards and the search field lift on a cream-tinted shadow; nothing has an outline. Sheets (the food panel) float above the day with a stronger shadow and a scrim.

### Shadow Vocabulary
- **Card** (`box-shadow: 0 1px 2px oklch(0.55 0.07 80 / 0.10), 0 6px 18px oklch(0.62 0.08 82 / 0.16)`): cards, the search field.
- **Float** (`box-shadow: 0 8px 24px -4px oklch(0.50 0.02 80 / 0.12), 0 4px 8px -4px oklch(0.50 0.02 80 / 0.06)`): sheets and menus.

### Named Rules
**The No-Outline Rule.** Cards have no border. A shadow lifts them; a hairline only ever divides rows.

## Shapes

One corner radius for anything that holds content: 20px for cards and the search field, so their curves match. Pills (tags, badges, protocol pills) are fully round. Icon tiles use 10px, food chips 7px.

## Components

- **Card:** card white, 20px corners, card shadow, 16px padding, no border. Holds one group of rows at most.
- **Row:** a title (16px) with a grey attribute line under it and, on the right, a badge when there is a verdict. Rows are split by hairlines, never boxed.
- **Badge:** a pill with symbol and word: ✓ Fits (green), − Limit (amber), ✕ Avoid (red).
- **Tag (entry type):** a small pill in the type's tint, edge and colour: Cycle, Food, Supplement, Symptom, Exposure.
- **Section label:** plain bold words in the meaning colour ("Possible trigger", "Worth watching"); no pill, no warning icon.
- **Protocol pill:** teal tint, teal ink, one per protocol, at the top of anything checked against a protocol.
- **Search:** "Find a food", card white, 20px corners, card shadow; shared by everyone. Results list every attribute in grey; verdict colour follows the Verdict and Reason Rules.
- **Timeline (the day):** time column, one thin line, a dot per entry in its type colour, the tag, then the words.

## Do's and Don'ts

- **Do** keep every food fact true to Pico's food database and protocol rules; every cause-and-symptom pairing must be factual (oxalate goes with joint pain; histamine with hives, flushing and brain fog).
- **Do** use the meaning colours only for their meanings, with their symbols and words.
- **Do** show attributes to everyone; colour them only when a verdict applies.
- **Don't** put a box inside a box, outline a card, or add a coloured stripe down a card's side.
- **Don't** tint whole sections or long lists; colour belongs to headings, badges and the one reason that matters.
- **Don't** use green for anything but "fits / helps", or teal for anything but actions and the brand.
- **Don't** colour strength or amount; say it in counts and dots.
- **Don't** show jargon, bare percentages, or anything prescriptive ("you should avoid…").
