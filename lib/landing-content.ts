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
  subtitle: "Real insights. Real tracking. Real patterns a food journal can't detect.",
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
      body: "See histamine, oxalate, FODMAP, gluten and more in the foods you eat.",
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

// The three example screens, the same ones as the community PDF (page 2).
// Every food fact on them was checked against the food database and protocol
// rules on 2026-11-18 (spinach, almonds, quinoa: high oxalate; sauerkraut
// contains histamine and tomato releases it; spinach is Limit on Low
// Histamine; chicken, zucchini, white rice fit). The percentages are one
// illustrative person's results. Re-check if ratings or rules change.
export const LANDING_SHOWCASE = {
  headline: "Real insights. Real tracking.",
  tagline: "Recognizing personal patterns is a powerful key to understanding your symptoms.",
  screens: [
    {
      src: "/landing/insights.png",
      alt: "Insights. Possible trigger, oxalate 71%: these 3 foods are high in oxalate; joint and muscle pain followed within 8 hours, 71% of the time (spinach, almonds, quinoa). Worth watching, histamine 34%: both of these foods raise histamine; flushing and brain fog followed within 2 hours, 34% of the time (sauerkraut, tomato).",
    },
    {
      src: "/landing/day.png",
      alt: "A day as a timeline, Thursday, March 12: 7:00a cycle day 22, luteal phase; 8:30a food, salmon, avocado, sauerkraut, AIP compliant; 9:00a supplement, vitamin D, omega-3, probiotics; 2:15p symptom, joint pain, severity 6/10; 4:00p exposure, mold, office building HVAC.",
    },
    {
      src: "/landing/protocol-check.png",
      alt: "Protocol check on the Low Histamine protocol, with a Find a food search. Lunch of chicken, spinach, zucchini, rice: chicken (fresh) fits; spinach, moderate histamine and very high oxalate, limit; zucchini fits; white rice fits. 3 of 4 foods fit.",
    },
  ],
  width: 1002,
  height: 1455,
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
