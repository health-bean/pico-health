// Copy for the public landing page (picohealth.app for signed-out visitors).
// Wording comes from the original healthbean.io site, which is what the founders
// want to lead with. Keep claims to what the app does today: no protocol counts,
// no moon/solar tracking, no practitioner dashboard yet, nothing that sounds like
// diagnosis.

export const LANDING = {
  hero: {
    eyebrow: "Early access",
    headline: "This is what intelligent health looks like.",
    subtitle: "Real insights. Real tracking. Real patterns your doctors may not see.",
  },
  problem: {
    label: "The problem",
    headline: "You're doing everything right. And still feel lost.",
    body: "Navigating chronic infections, mold and mycotoxin exposure, autoimmune conditions, uncontrolled inflammation, and complex healing protocols — often alone. People track symptoms across dozens of variables, manage multiple protocols simultaneously, and spend thousands searching for patterns their doctors may not see. And the environmental factors that influence recovery — food and supplement reactions, toxin exposures, chemical exposures, air quality — go completely untracked.",
    stat: { value: "50M+", description: "Americans with chronic illness" },
  },
  quote:
    "No one should navigate chronic illness alone. We build the intelligence layer that reveals what's working, what's not, and what to try next.",
  product: {
    label: "Pico Health",
    headline: "The Protocol Management & Healing Platform",
    features: [
      { icon: "activity", tone: "clay", text: "AI-powered symptom, supplement, and exposure tracking" },
      { icon: "clipboard", tone: "brick", text: "Healing protocols with built-in compliance intelligence" },
      { icon: "search", tone: "olive", text: "Correlation engine that identifies your unique triggers" },
      { icon: "wind", tone: "gold", text: "Environmental exposure tracking (mold, chemicals, EMF)" },
    ],
  },
  showcase: {
    label: "See it in action",
    headline: "Real insights. Real tracking.",
    cards: [
      {
        src: "/landing/card-1.png",
        alt: "A Pico Health pattern: three foods you eat regularly share a hidden property, high oxalate. Joint and muscle pain appeared within 8 hours 71% of the time. Contributing foods: spinach, almonds, quinoa.",
        caption: null,
      },
      {
        src: "/landing/card-2.png",
        alt: "A day on the Pico Health timeline: cycle day 22, breakfast, supplements, joint pain, and a mold exposure from an office HVAC system.",
        caption: null,
      },
      {
        src: "/landing/card-3.png",
        alt: "A home health score of 85 with maintenance tasks like replacing the HVAC filter.",
        caption: "Home health from Pico Home, our companion app",
      },
    ],
  },
  team: {
    label: "Who we are",
    headline: "Built by people who live it.",
    members: [
      {
        initials: "AM",
        name: "Amy Mandell",
        role: "Co-Founder",
        bio: "Certified Health Coach who has navigated her own chronic illness journey. Her lived experience and deep roots in the functional and alternative medicine community drive everything we build.",
        tone: "clay",
      },
      {
        initials: "DB",
        name: "Dee Byrne",
        role: "Co-Founder",
        bio: "Leads product and engineering and built Pico Health from the ground up. Chronic illness in Dee's own family is the reason it exists.",
        tone: "teal",
      },
    ],
  },
  join: {
    title: "Be the first to know.",
    body: "Sign up for early access and we'll let you know when Pico Health is ready for you.",
    button: "Get early access",
    success: "You're on the list. We'll let you know when Pico Health is ready for you.",
    privacy: "We'll only use your email to tell you about Pico Health.",
  },
  disclaimer:
    "Pico Health shows patterns in your own log. It does not diagnose or treat any condition. Talk with your practitioner before changing your care.",
} as const;
