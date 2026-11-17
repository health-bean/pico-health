/**
 * The one line a food card shows about the person: "Allowed on Low FODMAP",
 * "Avoid on AIP: nightshade", "Not rated yet for Low Histamine" — or, when
 * the person has rated the food themselves, "Fine for you · passed
 * reintroduction". A personal rating outranks the diet's rule. Names the
 * diet, not the ingredient.
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

/** ✓ Allowed, − Limit, ✕ Avoid; nothing for "not rated yet". Rendered by components/foods/FitSymbol. */
export const FIT_TONE_SYMBOL: Record<FitTone, "check" | "minus" | "x" | null> = {
  allowed: "check",
  limit: "minus",
  avoid: "x",
  unknown: null,
};

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

/** "AIP (Autoimmune Protocol)" → "AIP". */
export function shortDietName(name: string): string {
  return name.replace(/\s*\(.*\)\s*$/, "").trim() || name;
}

/** "Nightshade not allowed" → "nightshade"; "Histamine (high) not allowed" → "high histamine". */
function reasonText(v: string): string {
  const s = v
    .replace(/\s+not allowed$/i, "")
    .replace(/\s+should be limited$/i, "")
    .replace(/:\s*limit and test your tolerance$/i, "")
    .trim();
  // "Histamine (high)" / "Tyramine (very_high)" read better level-first.
  const m = s.match(/^(.+?)\s+\(?(very[ _]high|high|moderate)\)?$/i);
  const out = (m ? `${m[2].replace("_", " ")} ${m[1]}` : s).toLowerCase();
  return out.replace(/\bfodmap/g, "FODMAP");
}

function personalLine(p: PersonalRating): FitLine {
  switch (p.status) {
    case "safe":
      return { tone: "allowed", text: p.source === "trial" ? "Fine for you · passed reintroduction" : "Fine for you" };
    case "sensitive":
      return { tone: "limit", text: "Small amounts for you" };
    case "unsafe":
      return { tone: "avoid", text: p.source === "trial" ? "Not for you · reacted in reintroduction" : "Not for you" };
  }
}

/** The card's line, or null when there's neither a diet nor a personal rating. */
export function fitLine(fit: FoodFit): FitLine | null {
  if (fit.personal) return personalLine(fit.personal);
  if (!fit.diet) return null;
  const reasons = fit.reasons.filter((r) => !/not rated yet$/i.test(r)).map(reasonText);
  const why = reasons.length ? `: ${reasons.join(", ")}` : "";
  switch (statusTone(fit.status)) {
    case "avoid":
      return { tone: "avoid", text: `Avoid on ${fit.diet}${why}` };
    case "limit":
      return { tone: "limit", text: `Limit on ${fit.diet}${why}` };
    case "allowed":
      return { tone: "allowed", text: `Allowed on ${fit.diet}` };
    default:
      return { tone: "unknown", text: `Not rated yet for ${fit.diet}` };
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
