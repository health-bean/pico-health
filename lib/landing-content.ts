// Copy for the public landing page (picohealth.app for signed-out visitors).
// Ported from the original healthbean.io site, which is what the founders want to
// lead with. Keep claims to what the app does today: no protocol counts, no
// moon/solar tracking, no practitioner dashboard yet, nothing that sounds like
// diagnosis.

export const LANDING_SITE = { name: "Pico Health" } as const;

export const LANDING_HERO = {
  badge: "Pattern Detected",
  insight:
    "3 foods you eat regularly share a hidden property: high oxalate. Your joint and muscle pain appeared within 8 hours of eating them 71% of the time.",
  confidence: 71,
  foods: ["Spinach", "Almonds", "Quinoa"],
  headline: "This is what intelligent health looks like.",
  subtitle: "Real insights. Real tracking. Real patterns your doctors may not see.",
} as const;

export const LANDING_PROBLEM = {
  label: "The Problem",
  headline: "You're doing everything right. And still feel lost.",
  body: "Navigating chronic infections, mold and mycotoxin exposure, autoimmune conditions, uncontrolled inflammation, and complex healing protocols — often alone. People track symptoms across dozens of variables, manage multiple protocols simultaneously, and spend thousands searching for patterns their doctors may not see. And the environmental factors that influence recovery — food and supplement reactions, toxin exposures, chemical exposures, air quality — go completely untracked.",
  stats: [
    { value: "50M+", description: "Americans with\nchronic illness" },
    { value: "Billions", description: "invested in mobile\nhealth every year" },
  ],
} as const;

export const LANDING_QUOTE =
  "No one should navigate chronic illness alone. We build the intelligence layer that reveals what's working, what's not, and what to try next.";

export const LANDING_SHOWCASE = {
  label: "See It In Action",
  insight: {
    badge: "Property Pattern",
    title:
      "3 foods you eat regularly share a hidden property: high oxalate. Joint and muscle pain appeared within 8 hours 71% of the time.",
    confidence: "71%",
    foods: ["Spinach", "Almonds", "Quinoa"],
    correlations: [
      { property: "Oxalate", level: "high" as const, percent: 71 },
      { property: "Histamine", level: "moderate" as const, percent: 34 },
      { property: "Salicylate", level: "low" as const, percent: 12 },
    ],
  },
  timeline: {
    date: "Tuesday, March 12",
    entries: [
      { time: "7:00a", type: "Cycle" as const, description: "Cycle day 22 — luteal phase" },
      { time: "8:30a", type: "Meal" as const, description: "Salmon, avocado, sauerkraut", note: "AIP compliant" },
      { time: "9:00a", type: "Supplement" as const, description: "Vitamin D, Omega-3, Probiotics" },
      { time: "2:15p", type: "Symptom" as const, description: "Joint pain — severity 6/10" },
      { time: "4:00p", type: "Exposure" as const, description: "Mold — office building HVAC" },
    ],
  },
  homeHealth: {
    caption: "Home health from Pico Home, our companion app",
    score: 85,
    tasks: [
      { name: "Replace HVAC Filter", status: "overdue" as const, detail: "Overdue 3 days" },
      { name: "Test Smoke Detectors", status: "soon" as const, detail: "Due in 2 days" },
      { name: "Clean Dryer Vent", status: "scheduled" as const, detail: "Scheduled — Apr 20" },
    ],
  },
} as const;

export const LANDING_TEAM = {
  label: "Who We Are",
  headline: "Built by people who live it.",
  members: [
    {
      name: "Amy Mandell",
      initials: "AM",
      role: "Co-Founder",
      bio: "Certified Health Coach who has navigated her own chronic illness journey. Her lived experience and deep roots in the functional and alternative medicine community drive everything we build.",
    },
    {
      name: "Dee Byrne",
      initials: "DB",
      role: "Co-Founder",
      bio: "Leads product and engineering and built Pico Health from the ground up. Chronic illness in Dee's own family is the reason it exists.",
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
