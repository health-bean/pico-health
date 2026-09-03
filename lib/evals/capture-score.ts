/**
 * Scoring for capture-extraction evals.
 *
 * Pure functions: no network, no database. The runner
 * (scripts/eval-capture.ts) collects model output, this file judges it.
 */

export interface ExpectedEntry {
  entryType: string;
  name: string;
  /** Other phrasings that should count as a correct match. */
  alsoAccept?: string[];
  severity?: number;
  preparation?: string[];
}

export interface Fixture {
  id: string;
  category: string;
  input: string;
  /** Local capture time, HH:MM — drives meal-type inference. */
  at?: string;
  expect: {
    entries: ExpectedEntry[];
    mealType?: string;
    /** Names that must NOT be logged (negations, intentions, advice). */
    forbidNames?: string[];
  };
  notes?: string;
}

export interface ActualEntry {
  entryType: string;
  name: string;
  severity?: number | null;
  mealType?: string | null;
  preparation?: string[];
}

export interface FixtureScore {
  id: string;
  category: string;
  matchedCount: number;
  expectedCount: number;
  missed: string[];
  extra: string[];
  forbidden: string[];
  /** null when the fixture doesn't test this dimension. */
  mealTypeOk: boolean | null;
  preparationOk: boolean | null;
  severityOk: boolean | null;
  perfect: boolean;
}

/** Lowercase, strip punctuation, drop filler words, singularize simple plurals. */
export function normalizeName(raw: string): string {
  const FILLER = new Set(["some", "a", "an", "the", "of", "with", "fresh", "my"]);
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0 && !FILLER.has(t))
    .map((t) => (t.length > 3 && t.endsWith("s") && !t.endsWith("ss") ? t.slice(0, -1) : t))
    .join(" ");
}

/**
 * How well an actual name matches an expected one.
 * 3 = exact, 2 = accepted alias, 1 = subset/substring, 0 = no match.
 */
export function nameMatchScore(expected: ExpectedEntry, actualName: string): number {
  const actual = normalizeName(actualName);
  if (!actual) return 0;

  const canonical = normalizeName(expected.name);
  if (actual === canonical) return 3;

  for (const alias of expected.alsoAccept ?? []) {
    if (actual === normalizeName(alias)) return 2;
  }

  const candidates = [canonical, ...(expected.alsoAccept ?? []).map(normalizeName)];
  for (const cand of candidates) {
    if (!cand) continue;
    const candTokens = cand.split(" ");
    const actualTokens = actual.split(" ");
    const candInActual = candTokens.every((t) => actualTokens.includes(t));
    const actualInCand = actualTokens.every((t) => candTokens.includes(t));
    if (candInActual || actualInCand) return 1;
  }
  return 0;
}

/** Greedy one-to-one assignment of actual entries to expected entries, best matches first. */
function assign(
  expected: ExpectedEntry[],
  actual: ActualEntry[]
): { pairs: Array<{ exp: ExpectedEntry; act: ActualEntry }>; missed: ExpectedEntry[]; extra: ActualEntry[] } {
  const candidates: Array<{ score: number; ei: number; ai: number }> = [];
  expected.forEach((exp, ei) => {
    actual.forEach((act, ai) => {
      if (act.entryType !== exp.entryType) return;
      const score = nameMatchScore(exp, act.name);
      if (score > 0) candidates.push({ score, ei, ai });
    });
  });
  candidates.sort((a, b) => b.score - a.score);

  const usedExp = new Set<number>();
  const usedAct = new Set<number>();
  const pairs: Array<{ exp: ExpectedEntry; act: ActualEntry }> = [];
  for (const c of candidates) {
    if (usedExp.has(c.ei) || usedAct.has(c.ai)) continue;
    usedExp.add(c.ei);
    usedAct.add(c.ai);
    pairs.push({ exp: expected[c.ei], act: actual[c.ai] });
  }

  return {
    pairs,
    missed: expected.filter((_, i) => !usedExp.has(i)),
    extra: actual.filter((_, i) => !usedAct.has(i)),
  };
}

export function scoreFixture(fixture: Fixture, actual: ActualEntry[]): FixtureScore {
  const expected = fixture.expect.entries ?? [];
  const { pairs, missed, extra } = assign(expected, actual);

  // Hallucination guards, checked against UNMATCHED entries only: an entry that
  // legitimately satisfied an expectation isn't a hallucination even if a forbidden
  // word appears inside it (e.g. expecting "migraine" while forbidding "headache"
  // must not both fire on the output "migraine headache").
  const forbidden: string[] = [];
  for (const forbid of fixture.expect.forbidNames ?? []) {
    const guard: ExpectedEntry = { entryType: "", name: forbid };
    for (const act of extra) {
      if (nameMatchScore(guard, act.name) > 0) forbidden.push(act.name);
    }
  }

  // Meal type: judged on matched food entries only.
  let mealTypeOk: boolean | null = null;
  if (fixture.expect.mealType) {
    const foodPairs = pairs.filter((p) => p.exp.entryType === "food");
    mealTypeOk =
      foodPairs.length > 0 &&
      foodPairs.every((p) => (p.act.mealType ?? "").toLowerCase() === fixture.expect.mealType);
  }

  // Preparation: every expected preparation tag must be present on its entry.
  const prepExpected = pairs.filter((p) => (p.exp.preparation ?? []).length > 0);
  const preparationOk =
    prepExpected.length === 0
      ? null
      : prepExpected.every((p) =>
          (p.exp.preparation ?? []).every((tag) =>
            (p.act.preparation ?? []).map((x) => x.toLowerCase()).includes(tag.toLowerCase())
          )
        );

  // Severity: only where the fixture states one.
  const sevExpected = pairs.filter((p) => p.exp.severity !== undefined);
  const severityOk =
    sevExpected.length === 0
      ? null
      : sevExpected.every((p) => p.act.severity === p.exp.severity);

  const perfect =
    missed.length === 0 &&
    extra.length === 0 &&
    forbidden.length === 0 &&
    mealTypeOk !== false &&
    preparationOk !== false &&
    severityOk !== false;

  return {
    id: fixture.id,
    category: fixture.category,
    matchedCount: pairs.length,
    expectedCount: expected.length,
    missed: missed.map((m) => `${m.entryType}:${m.name}`),
    extra: extra.map((e) => `${e.entryType}:${e.name}`),
    forbidden,
    mealTypeOk,
    preparationOk,
    severityOk,
    perfect,
  };
}

export interface Aggregate {
  fixtures: number;
  perfect: number;
  perfectRate: number;
  entryPrecision: number;
  entryRecall: number;
  entryF1: number;
  mealTypeAccuracy: number | null;
  preparationAccuracy: number | null;
  severityAccuracy: number | null;
  /** Share of fixtures that produced an unexpected or forbidden entry. */
  hallucinationRate: number;
  byCategory: Record<string, { fixtures: number; perfect: number; perfectRate: number }>;
}

function rate(ok: number, total: number): number | null {
  return total === 0 ? null : ok / total;
}

export function aggregate(scores: FixtureScore[]): Aggregate {
  const matched = scores.reduce((n, s) => n + s.matchedCount, 0);
  const expectedTotal = scores.reduce((n, s) => n + s.expectedCount, 0);
  const extraTotal = scores.reduce((n, s) => n + s.extra.length, 0);

  const precision = matched + extraTotal === 0 ? 1 : matched / (matched + extraTotal);
  const recall = expectedTotal === 0 ? 1 : matched / expectedTotal;
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

  const mealJudged = scores.filter((s) => s.mealTypeOk !== null);
  const prepJudged = scores.filter((s) => s.preparationOk !== null);
  const sevJudged = scores.filter((s) => s.severityOk !== null);

  const byCategory: Aggregate["byCategory"] = {};
  for (const s of scores) {
    const bucket = (byCategory[s.category] ??= { fixtures: 0, perfect: 0, perfectRate: 0 });
    bucket.fixtures++;
    if (s.perfect) bucket.perfect++;
  }
  for (const bucket of Object.values(byCategory)) {
    bucket.perfectRate = bucket.fixtures === 0 ? 0 : bucket.perfect / bucket.fixtures;
  }

  const perfect = scores.filter((s) => s.perfect).length;
  const hallucinated = scores.filter((s) => s.extra.length > 0 || s.forbidden.length > 0).length;

  return {
    fixtures: scores.length,
    perfect,
    perfectRate: scores.length === 0 ? 0 : perfect / scores.length,
    entryPrecision: precision,
    entryRecall: recall,
    entryF1: f1,
    mealTypeAccuracy: rate(mealJudged.filter((s) => s.mealTypeOk).length, mealJudged.length),
    preparationAccuracy: rate(prepJudged.filter((s) => s.preparationOk).length, prepJudged.length),
    severityAccuracy: rate(sevJudged.filter((s) => s.severityOk).length, sevJudged.length),
    hallucinationRate: scores.length === 0 ? 0 : hallucinated / scores.length,
    byCategory,
  };
}
