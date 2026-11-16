/**
 * The one line a food card shows about the person's diet: "Allowed on Low
 * FODMAP", "Avoid on AIP: nightshade", "Limit on Low Histamine: …", or
 * "Not rated yet for Low Histamine". Names the diet, not the ingredient.
 */

export type FitTone = "allowed" | "limit" | "avoid" | "unknown";

export interface FitLine {
  tone: FitTone;
  text: string;
}

export interface FoodFit {
  /** Short diet name, e.g. "AIP". */
  diet: string;
  status: string;
  reasons: string[];
}

/** "AIP (Autoimmune Protocol)" → "AIP". */
export function shortDietName(name: string): string {
  return name.replace(/\s*\(.*\)\s*$/, "").trim() || name;
}

/** "Nightshade not allowed" → "nightshade"; "Histamine High should be limited" → "high histamine". */
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

export function fitLine(fit: FoodFit): FitLine {
  const reasons = fit.reasons.filter((r) => !/not rated yet$/i.test(r)).map(reasonText);
  const why = reasons.length ? `: ${reasons.join(", ")}` : "";
  switch (fit.status) {
    case "avoid":
      return { tone: "avoid", text: `Avoid on ${fit.diet}${why}` };
    case "moderation":
    case "caution":
      return { tone: "limit", text: `Limit on ${fit.diet}${why}` };
    case "allowed":
      return { tone: "allowed", text: `Allowed on ${fit.diet}` };
    default:
      return { tone: "unknown", text: `Not rated yet for ${fit.diet}` };
  }
}
