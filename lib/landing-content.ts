// Copy for the public landing page (picohealth.app for signed-out visitors).
// Ported from the original healthbean.io site, which is what the founders want to
// lead with. Keep claims to what the app does today: no protocol counts, no
// moon/solar tracking, no practitioner dashboard yet, nothing that sounds like
// diagnosis.

export const LANDING_SITE = { name: "Pico Health" } as const;

export const LANDING_HERO = {
  badge: "Pattern detected",
  insight:
    "3 foods you eat regularly share a hidden property: they're very high in oxalate. Joint pain showed up on 5 of the 7 days you ate them.",
  days: 5,
  ofDays: 7,
  daysLabel: "days with joint pain",
  foodsLabel: "Very high in oxalate:",
  foods: ["Spinach", "Almonds", "Quinoa"],
  headline: "This is what intelligent health looks like",
  subtitle: "Real insights. Real tracking. Real patterns that are easy to miss between appointments.",
} as const;

export const LANDING_PROBLEM = {
  headline: "You're doing everything right and still don't feel better?",
  body: "Navigating autoimmune conditions, uncontrolled inflammation, chronic infections, mold exposure, and complex dietary protocols — often alone. Tracking dozens of moving parts when you already feel terrible is nearly impossible. We're putting an end to the overwhelm. Now, you can track what's in your control — from food and supplements to toxin exposures and at-home therapies — so you can clearly see what may be helping.",
  stats: [
    { value: "3 in 4", description: "US adults live with a\nchronic condition", source: "CDC, Preventing Chronic Disease (2025)" },
  ],
} as const;

export const LANDING_QUOTE =
  "No one should navigate chronic illness alone. We build the intelligence layer that reveals what's working, what's not, and what to try next.";

export const LANDING_FEATURES = {
  headline: "Your Protocol Management Platform",
  items: [
    {
      title: "Your foods' biochemical profiles",
      body: "See histamine, oxalate, FODMAP, tyramine and more in the foods you eat.",
    },
    {
      title: "Checked against your protocol",
      body: "Instantly cross-reference daily foods to your personalized nutritional protocol.",
    },
    {
      title: "See patterns you may miss",
      body: "Our correlation engine helps you spot patterns worth testing with your practitioner.",
    },
    {
      title: "Track everything in one place",
      body: "Symptoms, food, supplements and environmental exposures (mold, chemicals, air quality).",
    },
  ],
} as const;

// Every line below must read exactly as the app shows it today. Verdicts in
// `foodList` are the real Low Histamine results from the food database
// (checked 2026-11-16); re-check them if the ratings or rules change.
export const LANDING_SHOWCASE = {
  headline: "Real insights. Real tracking.",
  tagline: "Recognizing personal patterns is a powerful key to understanding your symptoms.",
  insight: {
    section: "Patterns worth keeping an eye on",
    title: "Foods very high in oxalate",
    lines: ["Joint pain on 5 of 7 days", "Fatigue on 4 of 7 days"],
    foodsLabel: "Very high in oxalate:",
    foods: ["Spinach", "Almonds", "Quinoa"],
    note: "Patterns in your own log, not a diagnosis.",
  },
  timeline: {
    date: "Tuesday, March 10",
    reflect: "Sleep 6/10 · Energy 4/10 · Cycle day 22",
    entries: [
      { time: "8:30a", type: "Food" as const, description: "Salmon, avocado, sauerkraut", note: "Allowed on AIP" },
      { time: "9:00a", type: "Supplement" as const, description: "Vitamin D, omega-3, probiotic" },
      { time: "2:15p", type: "Symptom" as const, description: "Joint pain, 6/10" },
      { time: "4:00p", type: "Exposure" as const, description: "Mold, office building HVAC" },
    ],
  },
  foodList: {
    title: "My food list",
    diet: "Low Histamine",
    groups: [
      {
        tone: "avoid" as const,
        title: "Avoid on Low Histamine",
        foods: [
          { name: "Salami", reason: "moderate histamine, very high tyramine" },
          { name: "Blue Cheese", reason: "moderate histamine, very high tyramine" },
        ],
      },
      {
        tone: "limit" as const,
        title: "Limit on Low Histamine",
        foods: [
          { name: "Spinach", reason: "moderate histamine, may release histamine" },
          { name: "Strawberries", reason: "may release histamine" },
          { name: "Tomato", reason: "may release histamine" },
        ],
      },
      {
        tone: "allowed" as const,
        title: "Allowed on Low Histamine",
        foods: [
          { name: "Chicken Breast", reason: "" },
          { name: "Zucchini", reason: "" },
          { name: "Cucumber", reason: "" },
        ],
      },
    ],
  },
} as const;

export const LANDING_TEAM = {
  headline: "Built by people who live it.",
  members: [
    {
      name: "Amy Mandell",
      initials: "AM",
      role: "Co-Founder",
      bio: "Certified Health Coach who has navigated her own chronic illness journey. Her lived experience and deep roots in the chronic illness community drive everything we build.",
    },
    {
      name: "Dee Byrne",
      initials: "DB",
      role: "Founder & CEO",
      bio: "Leads product and engineering, and built Pico Health from the ground up. Witnessing chronic illness in her own family drives Dee to make that path easier for others.",
    },
  ],
} as const;

export const LANDING_CTA = {
  headline: "Be the first to know.",
  body: "Sign up for early access and we'll let you know when Pico Health is ready for you.",
  note: "No spam. Just a heads up when we launch.",
} as const;

export const LANDING_FORM = {
  placeholder: "your@email.com",
  button: "Get Early Access",
  sending: "Sending...",
  success: "You're on the list. We'll let you know when Pico Health is ready for you.",
} as const;

export const LANDING_DISCLAIMER =
  "Pico Health shows patterns in your own log. It does not diagnose or treat any condition. Talk with your practitioner before changing your care.";
