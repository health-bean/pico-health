// Shift demo accounts' logged data so it ends today, keeping every entry,
// food link, and designed pattern intact. Derived caches are cleared so the
// insights engine rebuilds them from the shifted dates.
// Usage (dry run by default, rolls back). .env.local's direct DB host is
// IPv6-only, so pull the production env (pooler URL) into a temp file:
//   npx vercel env pull /tmp/pico.env --environment=production --yes
//   set -a && source /tmp/pico.env && set +a && node lib/db/refresh-demo-dates.mjs
//   node lib/db/refresh-demo-dates.mjs --commit && rm -f /tmp/pico.env
import postgres from "postgres";
const COMMIT = process.argv.includes("--commit");
const TARGET = new Date().toLocaleDateString("en-CA"); // local YYYY-MM-DD
const EMAILS = ["demo@picohealth.app", "demo@filohealth.com"];
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });

class Rollback extends Error {}
try {
  await sql.begin(async (tx) => {
    for (const email of EMAILS) {
      const [u] = await tx`select id from profiles where email = ${email}`;
      if (!u) { console.log(email, "not found, skipped"); continue; }
      const [{ last }] = await tx`select greatest((select max(entry_date) from timeline_entries where user_id = ${u.id}), (select max(entry_date) from journal_entries where user_id = ${u.id}))::text as last`;
      if (!last) { console.log(email, "no entries, skipped"); continue; }
      const [{ offset }] = await tx`select (${TARGET}::date - ${last}::date) as offset`;
      if (offset <= 0) { console.log(email, "already current, skipped"); continue; }

      const before = await tx`select
        (select count(*)::int from timeline_entries where user_id=${u.id}) as entries,
        (select count(*)::int from journal_entries where user_id=${u.id}) as journals,
        (select min(entry_date)::text from timeline_entries where user_id=${u.id}) as first,
        (select count(*)::int from timeline_entries where user_id=${u.id} and food_id is not null) as linked`;

      const t = await tx`update timeline_entries set entry_date = entry_date + ${offset}::int where user_id = ${u.id}`;
      // Two steps: journal has a unique (user, date) index, and the old and new ranges overlap.
      await tx`update journal_entries set entry_date = entry_date + 100000 where user_id = ${u.id}`;
      const j = await tx`update journal_entries set entry_date = entry_date - 100000 + ${offset}::int where user_id = ${u.id}`;
      const dc = await tx`delete from day_composites where user_id = ${u.id}`;
      const al = await tx`delete from insight_alerts where user_id = ${u.id}`;

      const after = await tx`select
        (select count(*)::int from timeline_entries where user_id=${u.id}) as entries,
        (select count(*)::int from journal_entries where user_id=${u.id}) as journals,
        (select min(entry_date)::text from timeline_entries where user_id=${u.id}) as first,
        (select max(entry_date)::text from timeline_entries where user_id=${u.id}) as last,
        (select max(entry_date)::text from journal_entries where user_id=${u.id}) as journal_last,
        (select count(*)::int from timeline_entries where user_id=${u.id} and food_id is not null) as linked`;
      console.log(email, { offset, before: before[0], after: after[0], shifted: { timeline: t.count, journal: j.count }, cleared: { day_composites: dc.count, open_and_dismissed_alerts: al.count } });
      if (after[0].entries !== before[0].entries || after[0].journals !== before[0].journals || after[0].linked !== before[0].linked || (after[0].last ?? '') > TARGET || (after[0].journal_last ?? '') > TARGET || (after[0].last !== TARGET && after[0].journal_last !== TARGET)) {
        throw new Error(`verification failed for ${email}`);
      }
    }
    if (!COMMIT) throw new Rollback("dry run");
  });
  console.log(COMMIT ? "COMMITTED" : "");
} catch (e) {
  if (e instanceof Rollback) console.log("DRY RUN: rolled back, nothing written");
  else { console.error("FAILED, rolled back:", e.message); process.exitCode = 1; }
} finally {
  await sql.end();
}
