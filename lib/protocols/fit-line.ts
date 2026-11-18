/**
 * The one line a food shows about the person: "Allowed", "Limit · histamine",
 * "Avoid · tyramine, histamine", or, when they've rated the food themselves,
 * "Fine for you · passed reintroduction". A personal rating outranks the
 * diet's rule. The diet is named once for the whole day, not on every food,
 * and a reason is the property or food group in one plain word (levels and
 * "may release" variants collapse into it), at most two.
 */

export type FitTone = "allowed" | "limit" | "avoid" | "unknown";

/**
 * One colour per tone, app-wide (Log, My food list, food search, the rating
 * picker): Avoid = brick, Limit = ochre, Allowed = teal. Not a traffic light:
 * each tone also has a symbol (FIT_TONE_SYMBOL), so the meaning survives
 * without colour, and the words always carry it too.
 */
export const FIT_TONE_CLASS: Record<FitTone, { text: string; chip: string }> = {
  allowed: { text: "text-teal-700", chip: "border-teal-300 bg-teal-50 text-teal-800" },
  limit: { text: "text-ochre-700", chip: "border-ochre-500/50 bg-ochre-500/10 text-ochre-700" },
  avoid: { text: "text-brick-600", chip: "border-brick-600/40 bg-brick-600/10 text-brick-600" },
  unknown: { text: "text-warm-500", chip: "border-warm-200 bg-warm-100 text-warm-700" },
};

/** ✓ Allowed, − Limit, ✕ Avoid, ? Not rated yet. Rendered by components/foods/FitSymbol. */
export const FIT_TONE_SYMBOL: Record<FitTone, "check" | "minus" | "x" | "question"> = {
  allowed: "check",
  limit: "minus",
  avoid: "x",
  unknown: "question",
};

/**
 * Whether the Log marks a food. Only what needs attention: Limit, Avoid,
 * not rated yet, and the person's own rating. "Allowed" is the normal case
 * on a protocol, so a food with no mark means allowed; search and My food
 * list still say "Allowed", because there every answer matters.
 */
export function showOnLog(line: FitLine | null, hasPersonalRating: boolean): boolean {
  if (!line) return false;
  return hasPersonalRating || line.tone !== "allowed";
}

/** A diet's food status ("avoid", "moderation", "caution", "allowed", …) as a tone. */
export function statusTone(status: string | null | undefined): FitTone {
  switch (status) {
    case "avoid":
      return "avoid";
    case "moderation":
    case "caution":
      return "limit";
    case "allowed":
      return "allowed";
    default:
      return "unknown";
  }
}

export interface FitLine {
  tone: FitTone;
  text: string;
  /** What causes a Limit / Avoid, one plain word each ("histamine", "nightshade"); empty otherwise. */
  reasons: string[];
}

/** safe = fine for me, sensitive = small amounts, unsafe = not for me. */
export type PersonalStatus = "safe" | "sensitive" | "unsafe";
export type PersonalSource = "self" | "trial" | "insight";

export interface PersonalRating {
  status: PersonalStatus;
  source: PersonalSource;
}

export interface FoodFit {
  /** Short diet name, e.g. "AIP"; null when the person has no diet set. */
  diet: string | null;
  status: string;
  reasons: string[];
  personal?: PersonalRating | null;
}

/** "Low Histamine" → "your Low Histamine protocol"; never "protocol protocol". */
export function protocolPhrase(diet: string): string {
  const name = shortDietName(diet);
  return /\bprotocol$/i.test(name) ? `your ${name}` : `your ${name} protocol`;
}

/** "AIP (Autoimmune Protocol)" → "AIP". */
export function shortDietName(name: string): string {
  return name.replace(/\s*\(.*\)\s*$/, "").trim() || name;
}

/** Most reasons a line names; the rest are one tap away in the food's details. */
const MAX_REASONS = 2;

/**
 * "Histamine (moderate) should be limited" → "histamine";
 * "May release histamine: limit and test your tolerance" → "histamine";
 * "Nightshade not allowed" → "nightshade".
 */
function reasonWord(v: string): string {
  const s = v
    .replace(/\s+not allowed$/i, "")
    .replace(/\s+should be limited$/i, "")
    .replace(/:\s*limit and test your tolerance$/i, "")
    .replace(/^may release\s+/i, "")
    .replace(/\s*\((very[ _]high|high|moderate|low)\)\s*$/i, "")
    .replace(/^(very[ _]high|high|moderate)\s+/i, "")
    .trim()
    .toLowerCase();
  return s.replace(/\bfodmaps?\b/g, "FODMAP");
}

function personalLine(p: PersonalRating): FitLine {
  switch (p.status) {
    case "safe":
      return { tone: "allowed", text: p.source === "trial" ? "Fine for you · passed reintroduction" : "Fine for you", reasons: [] };
    case "sensitive":
      return { tone: "limit", text: "Small amounts for you", reasons: [] };
    case "unsafe":
      return { tone: "avoid", text: p.source === "trial" ? "Not for you · reacted in reintroduction" : "Not for you", reasons: [] };
  }
}

/** The food's line, or null when there's neither a diet nor a personal rating. */
export function fitLine(fit: FoodFit): FitLine | null {
  if (fit.personal) return personalLine(fit.personal);
  if (!fit.diet) return null;
  const words = [...new Set(fit.reasons.filter((r) => !/not rated yet$/i.test(r)).map(reasonWord))].filter(Boolean);
  const reasons = words.slice(0, MAX_REASONS);
  const why = reasons.length ? ` · ${reasons.join(", ")}` : "";
  switch (statusTone(fit.status)) {
    case "avoid":
      return { tone: "avoid", text: `Avoid${why}`, reasons };
    case "limit":
      return { tone: "limit", text: `Limit${why}`, reasons };
    case "allowed":
      return { tone: "allowed", text: "Allowed", reasons: [] };
    default:
      return { tone: "unknown", text: "Not rated yet", reasons: [] };
  }
}

/**
 * The status that counts for this person: their own rating if they have one,
 * otherwise the diet's. Used wherever compliance feeds a decision (insights'
 * off-protocol factor), so a passed food stops counting as off-protocol.
 */
export function personalStatus(dietStatus: string, personal?: PersonalRating | null): string {
  if (!personal) return dietStatus;
  return personal.status === "safe" ? "allowed" : personal.status === "sensitive" ? "moderation" : "avoid";
}

/**
 * The protocols a list is checked against, by name: "Low Histamine protocol",
 * "Low Histamine and AIP protocols". Null when there are none.
 */
export function protocolsLabel(diets: string[]): string | null {
  const names = diets.filter(Boolean);
  if (names.length === 0) return null;
  const joined = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  return `${joined} ${names.length === 1 ? "protocol" : "protocols"}`;
}
