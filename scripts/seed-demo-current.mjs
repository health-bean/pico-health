// Demo data for demo@picohealth.app, shaped for the current Log / Insights / Reflect.
//
// Persona: Sarah, on a Low Histamine protocol after mold exposure. 60 days ending
// today (UTC). Planted stories the insights engine should surface:
//   - leftover lunches -> hives within ~2h (histamine builds as food sits)
//   - spinach / almonds -> joint pain that evening (oxalate)
//   - "Mold" exposure -> brain fog the same afternoon
//   - Magnesium glycinate -> less fatigue (helper)
//   - poor sleep on mold nights; slips get rarer in the second month
// Reflect also carries cycle day, ovulation, meditation, bedtime/wake, activity.
// Rates are deliberately imperfect and differ per story (hives ~8 in 10 after
// leftovers, brain fog ~6 in 10 with mold, joint pain ~6 in 10 with oxalate, a
// background rate without each), like a real log: 16-of-16 / 0%-otherwise reads as made up.
//
// Dry run by default (rolls back). Only touches the one demo user.
//   DATABASE_URL=... node scripts/seed-demo-current.mjs           # dry run
//   DATABASE_URL=... node scripts/seed-demo-current.mjs --commit  # write
// Afterwards run the insights engine once (or open Insights) so composites rebuild;
// the Redis insights cache expires on its own within 5 minutes.
import postgres from "postgres";

const COMMIT = process.argv.includes("--commit");
const EMAIL = "demo@picohealth.app";
const DAYS = 60;
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });

// Deterministic randomness so reruns produce the same demo.
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(Number(process.env.DEMO_SEED ?? 7));
const chance = (p) => rnd() < p;
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
const hhmm = (mins) => `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
const time = (mins) => `${hhmm(mins)}:00`;

const todayUtc = new Date().toISOString().slice(0, 10);
const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const startDate = addDays(todayUtc, -(DAYS - 1));

const BREAKFASTS = [["Oats", "Blueberries"], ["Eggs", "Sweet Potato"], ["Eggs", "Zucchini"], ["Oats", "Pear"]];
const LUNCH_BASE = [["Chicken Breast", "White Rice", "Cucumber"], ["Chicken Breast", "Quinoa", "Arugula"], ["Ground Turkey", "White Rice", "Zucchini"], ["Cod", "Quinoa", "Green Beans"]];
const DINNERS = [["Salmon", "Sweet Potato", "Broccoli"], ["Lamb", "White Rice", "Kale"], ["Chicken Breast", "Butternut Squash", "Green Beans"], ["Cod", "White Rice", "Asparagus"], ["Ground Turkey", "Quinoa", "Zucchini"], ["Chicken Breast", "White Rice", "Arugula"]];
const SNACKS = ["Apple", "Cucumber", "Blueberries", "Mango"];
const ALL_FOODS = [...new Set([...BREAKFASTS.flat(), ...LUNCH_BASE.flat(), ...DINNERS.flat(), ...SNACKS, "Olive Oil", "Spinach", "Almonds"])];

// What she types → the curated food it links to (the Nov 16 merge renamed some).
const ALIAS = { salmon: "salmon (fresh)" };
const lookup = (n) => ALIAS[n.toLowerCase()] ?? n.toLowerCase();

class Rollback extends Error {}

try {
  await sql.begin(async (tx) => {
    const [user] = await tx`select id from profiles where email = ${EMAIL}`;
    if (!user) throw new Error(`${EMAIL} not found`);
    const uid = user.id;

    const [protocol] = await tx`select id from protocols where name ilike 'Low Histamine%' limit 1`;
    if (!protocol) throw new Error("Low Histamine protocol not found");

    const foodRows = await tx`
      select distinct on (lower(f.display_name)) lower(f.display_name) as name, f.id
      from foods f join food_trigger_properties p on p.food_id = f.id
      where f.source = 'curated' and lower(f.display_name) in ${tx(ALL_FOODS.map(lookup))}
      order by lower(f.display_name), f.is_common desc nulls last`;
    const foodId = Object.fromEntries(foodRows.map((r) => [r.name, r.id]));
    const missing = ALL_FOODS.filter((n) => !foodId[lookup(n)]);
    if (missing.length) throw new Error(`curated foods missing: ${missing.join(", ")}`);

    // Clear this user's old demo data and derived caches.
    const cleared = {};
    for (const t of ["timeline_entries", "journal_entries", "day_composites", "insight_snapshots", "insight_alerts", "clarifier_responses"]) {
      const r = await tx`delete from ${tx(t)} where user_id = ${uid}`;
      cleared[t] = r.count;
    }

    await tx`update profiles set first_name = 'Sarah', onboarding_completed = true, is_admin = false,
      current_protocol_id = ${protocol.id}, tracking_goal_days = 60,
      tracking_goal_start_date = ${addDays(todayUtc, -44)} where id = ${uid}`;
    await tx`insert into user_protocol_state (user_id, protocol_id, phase_start_date)
      values (${uid}, ${protocol.id}, ${startDate})
      on conflict (user_id, protocol_id) do update set phase_start_date = excluded.phase_start_date`;

    const entries = [];
    const journals = [];
    const food = (date, name, mins, mealType, extra = {}) =>
      entries.push({ user_id: uid, entry_type: "food", name, food_id: foodId[lookup(name)], entry_date: date, entry_time: time(mins), meal_type: mealType, portion: "1 serving", structured_content: extra });
    const other = (date, type, name, mins, more = {}) =>
      entries.push({ user_id: uid, entry_type: type, name, entry_date: date, entry_time: time(mins), ...more });

    // Mold: a run of exposures early on (damp basement office), tapering after remediation.
    const moldDays = new Set();
    while (moldDays.size < 14) {
      const i = rnd() < 0.75 ? int(0, 34) : int(35, DAYS - 2);
      moldDays.add(i);
    }

    for (let i = 0; i < DAYS; i++) {
      const date = addDays(startDate, i);
      const isToday = i === DAYS - 1;
      const earlyHalf = i < 30;
      // Stories: leftovers -> hives (histamine builds as food sits), spinach/almonds -> joint pain
      // (oxalate), mold -> brain fog, magnesium -> less fatigue. Slips get rarer in month two.
      // Yesterday is a hand-picked showcase day for the Log screenshot: spinach omelet then joint pain,
      // leftovers at lunch, hives after. Random draws still happen so the rest is unchanged.
      const showcase = i === DAYS - 2;
      const leftoverLunch = (!isToday && chance(earlyHalf ? 0.3 : 0.15)) || showcase;
      const oxalateDay = (!isToday && chance(earlyHalf ? 0.4 : 0.2)) || showcase;
      // Showcase morning: no mold; a spinach omelet, then joint pain mid-morning (spinach is
      // very high in oxalate; joint pain is the symptom most tied to oxalate).
      const mold = moldDays.has(i) && !showcase;
      // She started magnesium regularly in the second month.
      const magnesium = chance(earlyHalf ? 0.3 : 0.75) || showcase;
      const poorSleep = mold ? chance(0.5) : chance(0.12);
      const checkin = (answer) => ({ checkin: { answer, at: `${date}T00:00:00.000Z` } });

      // Breakfast
      const bTime = int(7 * 60 + 15, 8 * 60 + 15);
      const breakfast = [...pick(BREAKFASTS)];
      if (showcase) breakfast.splice(0, breakfast.length, "Eggs", "Spinach"); // a spinach omelet
      for (const f of breakfast) food(date, f, bTime, "breakfast");
      // Oxalate reactions tend to come hours later, not minutes.
      if (showcase) other(date, "symptom", "Joint pain", bTime + 150, { severity: 5 });
      other(date, "supplement", "Vitamin D3", bTime);

      // Lunch: some days it's last night's leftovers
      const lTime = int(12 * 60, 13 * 60);
      const hives = (leftoverLunch ? chance(0.8) : chance(0.06)) || showcase;
      const lunch = leftoverLunch ? [...pick(DINNERS)] : [...pick(LUNCH_BASE)];
      if (oxalateDay && chance(0.75)) lunch.push("Spinach");
      // The showcase lunch is fixed (after the draws, so every other day is unchanged):
      // last night's lamb.
      if (showcase) lunch.splice(0, lunch.length, "Lamb", "White Rice", "Kale");
      const lunchExtra = {
        ...(leftoverLunch ? { preparation: ["leftover"] } : {}),
        ...(!isToday && chance(0.7) ? checkin(hives ? "symptom" : "fine") : {}),
      };
      for (const f of lunch) food(date, f, lTime, "lunch", lunchExtra);
      if (hives && !isToday) other(date, "symptom", "Hives", lTime + int(40, 150), { severity: int(4, 7) });

      // The odd headache, unrelated to anything
      const headache = !isToday && chance(0.08);
      if (headache) other(date, "symptom", "Headache", int(9 * 60, 20 * 60), { severity: int(3, 5) });

      if (mold) {
        other(date, "exposure", "Mold", int(8 * 60 + 45, 9 * 60 + 30), { severity: int(4, 7) });
      }
      const brainFog = (mold ? chance(0.6) : chance(0.1)) || showcase;
      if (brainFog && !isToday) other(date, "symptom", "Brain fog", int(14 * 60, 16 * 60 + 30), { severity: int(4, 7) });

      const fatigue = magnesium ? chance(0.17) : chance(0.55);
      if (fatigue && !isToday) other(date, "symptom", "Fatigue", int(15 * 60, 17 * 60), { severity: int(3, 6) });

      if (isToday) {
        journals.push(null);
        continue; // today: breakfast and lunch only, the evening is still ahead
      }

      // Snack; almonds on oxalate days
      const sTime = int(15 * 60, 16 * 60);
      if (oxalateDay) food(date, "Almonds", sTime, "snack");
      else if (chance(0.5)) food(date, pick(SNACKS), sTime, "snack");
      const jointPain = (oxalateDay ? chance(0.62) : chance(0.1)) || showcase;
      if (jointPain) other(date, "symptom", "Joint pain", sTime + int(45, 110), { severity: int(4, 7) });

      // Dinner; some nights it's leftovers
      const dTime = int(18 * 60, 19 * 60 + 30);
      const dinnerExtra = chance(0.6) ? checkin("fine") : {};
      const dinner = [...pick(DINNERS)]; // a copy: the showcase edit must not change the menu
      // Showcase dinner: foods the protocol rates, so the day reads cleanly.
      if (showcase) dinner.splice(0, dinner.length, "Chicken Breast", "Zucchini", "White Rice");
      for (const f of dinner) food(date, f, dTime, "dinner", dinnerExtra);
      food(date, "Olive Oil", dTime, "dinner", dinnerExtra);

      other(date, "medication", "Low-dose naltrexone", 22 * 60);
      if (magnesium) other(date, "supplement", "Magnesium glycinate", int(21 * 60, 21 * 60 + 45));
      if (chance(0.3)) other(date, "supplement", "DAO enzyme", lTime - 10);

      // Movement
      let activity = "light";
      if (chance(0.4)) {
        const yoga = chance(0.5);
        const minutes = yoga ? pick([20, 30, 45]) : pick([30, 40, 45]);
        const type = yoga ? "yoga" : "walking";
        const intensity = yoga ? "light" : "moderate";
        other(date, "exercise", yoga ? "Yoga" : "Walk", int(17 * 60, 17 * 60 + 40), {
          exercise_type: type, duration_minutes: minutes, intensity_level: intensity,
          structured_content: { exerciseType: type, durationMinutes: minutes, intensityLevel: intensity },
        });
        activity = intensity;
      }

      // Reflect. Stress uses the engine's scale (higher = more stressed) and stays mid-range.
      const rough = headache || brainFog || hives || jointPain;
      const cycleDay = ((i + 7) % 28) + 1; // today lands in the luteal phase
      const meditation = chance(0.5);
      journals.push({
        user_id: uid, entry_date: date,
        sleep_score: poorSleep ? int(3, 4) : int(6, 8),
        energy_score: fatigue || rough ? int(3, 5) : int(6, 8),
        mood_score: rough ? int(4, 6) : int(6, 8),
        stress_score: int(5, 6),
        pain_score: jointPain || headache ? int(3, 5) : int(7, 9),
        meditation_practice: meditation,
        meditation_minutes: meditation ? pick([10, 15, 20]) : null,
        cycle_day: cycleDay,
        ovulation: cycleDay === 14 ? true : null,
        bedtime: hhmm(int(22 * 60 + 15, 23 * 60 + 15)),
        wake_time: hhmm(int(6 * 60 + 40, 7 * 60 + 20)),
        activity_level: activity,
        notes: mold && chance(0.5) ? "Worked from the basement office today." : null,
      });
    }

    for (const e of entries) {
      e.structured_content = e.structured_content && Object.keys(e.structured_content).length ? e.structured_content : null;
    }
    const cols = ["user_id", "entry_type", "name", "food_id", "entry_date", "entry_time", "meal_type", "portion", "structured_content", "severity", "exercise_type", "duration_minutes", "intensity_level"];
    const rows = entries.map((e) => Object.fromEntries(cols.map((c) => [c, e[c] ?? null])));
    for (let k = 0; k < rows.length; k += 500) await tx`insert into timeline_entries ${tx(rows.slice(k, k + 500), cols)}`;
    const jrows = journals.filter(Boolean);
    await tx`insert into journal_entries ${tx(jrows)}`;

    const summary = await tx`
      select entry_type, count(*)::int as n from timeline_entries where user_id = ${uid} group by 1 order by 2 desc`;
    const story = await tx`
      select
        (select count(distinct entry_date)::int from timeline_entries where user_id=${uid} and name='Hives') as hives_days,
        (select count(distinct entry_date)::int from timeline_entries where user_id=${uid} and name='Joint pain') as joint_days,
        (select count(distinct entry_date)::int from timeline_entries where user_id=${uid} and name='Mold') as mold_days,
        (select count(distinct entry_date)::int from timeline_entries where user_id=${uid} and name='Brain fog') as fog_days,
        (select count(distinct entry_date)::int from timeline_entries where user_id=${uid} and name='Magnesium glycinate') as magnesium_days,
        (select min(entry_date)::text from timeline_entries where user_id=${uid}) as first,
        (select max(entry_date)::text from timeline_entries where user_id=${uid}) as last`;
    console.log({ cleared, inserted: { timeline: rows.length, journal: jrows.length }, byType: summary, story: story[0] });

    if (!COMMIT) throw new Rollback("dry run");
  });
  console.log(COMMIT ? "COMMITTED" : "");
} catch (e) {
  if (e instanceof Rollback) console.log("DRY RUN: rolled back, nothing written");
  else { console.error("FAILED, rolled back:", e.message); process.exitCode = 1; }
} finally {
  await sql.end();
}
