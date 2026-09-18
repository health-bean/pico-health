/**
 * Seed a real account with believable history so a person can test the app as
 * themselves. Scoped to one email: it clears and rewrites only that user's
 * entries, journals, and derived insight rows, and never touches anyone else.
 *
 * The data is built around a low-histamine story, so the engine has something
 * true to find: high-histamine days run with headaches, chocolate runs with
 * brain fog, late meals run with bloating, and magnesium days run cleaner.
 *
 * Usage (dry run by default, rolls back):
 *   npx vercel env pull /tmp/pico.env --environment=production --yes
 *   set -a && source /tmp/pico.env && set +a
 *   node lib/db/seed-test-user.mjs --email you@example.com
 *   node lib/db/seed-test-user.mjs --email you@example.com --commit && rm -f /tmp/pico.env
 */
import postgres from "postgres";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : fallback;
};
const EMAIL = arg("email");
const DAYS = parseInt(arg("days", "60"), 10);
const COMMIT = process.argv.includes("--commit");
if (!EMAIL) {
  console.error("--email is required");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });

// Foods that exist in the curated database, with the properties that matter here.
const HIGH_HISTAMINE = ["Sauerkraut", "Cheddar Cheese", "Tomato", "Spinach", "Dark Chocolate / Cocoa"];
const SAFE = ["Chicken Breast", "White Rice", "Sweet Potato", "Broccoli", "Salmon", "Olive Oil",
  "Blueberries", "Avocado", "Coconut Oil", "Ground Turkey", "Zucchini", "Cucumber", "Carrot"];
const SUPPLEMENTS = ["Magnesium", "Vitamin D", "Omega-3"];

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const chance = p => Math.random() < p;
const pad = n => String(n).padStart(2, "0");
const localDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const time = (h, m) => `${pad(h)}:${pad(m)}:00`;

class Rollback extends Error {}

try {
  await sql.begin(async tx => {
    const [user] = await tx`select id, email, first_name from profiles where email = ${EMAIL}`;
    if (!user) throw new Error(`No profile for ${EMAIL}`);

    const before = await tx`select
      (select count(*)::int from timeline_entries where user_id = ${user.id}) as entries,
      (select count(*)::int from journal_entries where user_id = ${user.id}) as journals`;

    // Resolve food ids so trigger properties and protocol checks light up.
    const foodRows = await tx`select id, display_name from foods where display_name = any(${[...HIGH_HISTAMINE, ...SAFE]})`;
    const foodId = Object.fromEntries(foodRows.map(f => [f.display_name, f.id]));
    const missing = [...HIGH_HISTAMINE, ...SAFE].filter(n => !foodId[n]);
    if (missing.length) throw new Error("Foods not found: " + missing.join(", "));

    await tx`delete from journal_entries where user_id = ${user.id}`;
    await tx`delete from timeline_entries where user_id = ${user.id}`;
    await tx`delete from day_composites where user_id = ${user.id}`;
    await tx`delete from insight_alerts where user_id = ${user.id}`;
    await tx`delete from insight_snapshots where user_id = ${user.id}`;

    const entries = [];
    const journals = [];
    const today = new Date();

    for (let back = DAYS - 1; back >= 0; back--) {
      const d = new Date(today);
      d.setDate(d.getDate() - back);
      const date = localDate(d);

      // What the day contained.
      const histamineDay = chance(0.4);
      const chocolateDay = chance(0.25);
      const lateMeal = chance(0.3);
      const magnesium = back < DAYS * 0.6 ? chance(0.85) : chance(0.2);   // started partway through

      const todaysFoods = [];
      if (histamineDay) todaysFoods.push(pick(HIGH_HISTAMINE.filter(f => f !== "Dark Chocolate / Cocoa")));
      if (chocolateDay) todaysFoods.push("Dark Chocolate / Cocoa");
      const safeCount = rand(3, 5);
      const shuffled = [...SAFE].sort(() => Math.random() - 0.5);
      todaysFoods.push(...shuffled.slice(0, safeCount));

      todaysFoods.forEach((name, i) => {
        const hour = lateMeal && i === todaysFoods.length - 1 ? rand(21, 22) : rand(7, 20);
        entries.push({
          user_id: user.id, entry_type: "food", name, severity: null,
          entry_date: date, entry_time: time(hour, rand(0, 59)), food_id: foodId[name],
          meal_type: hour < 11 ? "breakfast" : hour < 15 ? "lunch" : hour < 20 ? "dinner" : "snack",
        });
      });

      if (magnesium) entries.push({ user_id: user.id, entry_type: "supplement", name: "Magnesium", severity: null, entry_date: date, entry_time: time(21, rand(0, 30)), food_id: null, meal_type: null });
      if (chance(0.6)) entries.push({ user_id: user.id, entry_type: "supplement", name: pick(SUPPLEMENTS), severity: null, entry_date: date, entry_time: time(8, rand(0, 30)), food_id: null, meal_type: null });

      // Symptoms follow the story, with noise so nothing is perfectly clean.
      const headache = histamineDay ? chance(magnesium ? 0.45 : 0.75) : chance(0.12);
      const brainFog = chocolateDay ? chance(0.6) : chance(0.15);
      const bloating = lateMeal ? chance(0.55) : chance(0.15);
      const nausea = chance(0.08);

      if (headache) entries.push({ user_id: user.id, entry_type: "symptom", name: "Headache", severity: rand(4, 8), entry_date: date, entry_time: time(rand(14, 21), rand(0, 59)), food_id: null, meal_type: null });
      if (brainFog) entries.push({ user_id: user.id, entry_type: "symptom", name: "Brain Fog", severity: rand(3, 7), entry_date: date, entry_time: time(rand(13, 18), rand(0, 59)), food_id: null, meal_type: null });
      if (bloating) entries.push({ user_id: user.id, entry_type: "symptom", name: "Bloating", severity: rand(3, 7), entry_date: date, entry_time: time(rand(19, 23), rand(0, 59)), food_id: null, meal_type: null });
      if (nausea) entries.push({ user_id: user.id, entry_type: "symptom", name: "Nausea", severity: rand(3, 6), entry_date: date, entry_time: time(rand(10, 20), rand(0, 59)), food_id: null, meal_type: null });

      if (chance(0.8)) {
        const rough = headache || bloating;
        journals.push({
          user_id: user.id, entry_date: date,
          sleep_score: rand(rough ? 3 : 5, rough ? 7 : 9),
          energy_score: rand(rough ? 2 : 5, rough ? 6 : 9),
          mood_score: rand(rough ? 4 : 6, rough ? 7 : 9),
          stress_score: rand(rough ? 4 : 2, rough ? 9 : 6),
          pain_score: headache ? rand(4, 8) : rand(1, 4),
          notes: null,
        });
      }
    }

    for (let i = 0; i < entries.length; i += 200) {
      await tx`insert into timeline_entries ${tx(entries.slice(i, i + 200), "user_id", "entry_type", "name", "severity", "entry_date", "entry_time", "food_id", "meal_type")}`;
    }
    for (let i = 0; i < journals.length; i += 200) {
      await tx`insert into journal_entries ${tx(journals.slice(i, i + 200), "user_id", "entry_date", "sleep_score", "energy_score", "mood_score", "stress_score", "pain_score", "notes")}`;
    }

    const after = await tx`select
      (select count(*)::int from timeline_entries where user_id = ${user.id}) as entries,
      (select count(*)::int from journal_entries where user_id = ${user.id}) as journals,
      (select count(distinct entry_date)::int from timeline_entries where user_id = ${user.id}) as days,
      (select min(entry_date)::text from timeline_entries where user_id = ${user.id}) as first,
      (select max(entry_date)::text from timeline_entries where user_id = ${user.id}) as last,
      (select count(*)::int from timeline_entries where user_id = ${user.id} and food_id is not null) as linked,
      (select count(*)::int from timeline_entries where user_id = ${user.id} and entry_type = 'symptom') as symptoms`;

    console.log(user.email, {
      cleared: before[0],
      seeded: after[0],
    });

    if (after[0].last !== localDate(today)) throw new Error("last day is not today");
    if (!COMMIT) throw new Rollback("dry run");
  });
  console.log(COMMIT ? "COMMITTED" : "");
} catch (e) {
  if (e instanceof Rollback) console.log("DRY RUN: rolled back, nothing written");
  else { console.error("FAILED, rolled back:", e.message); process.exitCode = 1; }
} finally {
  await sql.end();
}
