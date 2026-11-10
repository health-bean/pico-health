/**
 * Fails if any table in `public` has Row Level Security off, or if the
 * `ensure_rls` event trigger (lib/db/migrations/rls-guard.sql) is missing.
 *
 * Supabase serves every `public` table over its REST API with the anon key,
 * so a table without RLS is open to anyone with the project URL. The app
 * itself is unaffected by RLS: Drizzle connects as the table owner.
 *
 * Run: npm run db:check-rls  (also runs after npm run db:push)
 */
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set (try: node --env-file=.env.local)");
  process.exit(2);
}

async function main(url: string) {
  const sql = postgres(url, { max: 1, prepare: false });

  try {
    const open = await sql<{ name: string }[]>`
      select c.relname as name
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind in ('r', 'p')
        and not c.relrowsecurity
      order by 1`;

    const [guard] = await sql<{ n: number }[]>`
      select count(*)::int as n from pg_event_trigger
      where evtname = 'ensure_rls' and evtenabled <> 'D'`;

    let failed = false;
    if (open.length > 0) {
      failed = true;
      console.error("Tables open to the Supabase REST API (RLS off):");
      for (const t of open) console.error(`  - ${t.name}`);
      console.error("Fix: ALTER TABLE public.<name> ENABLE ROW LEVEL SECURITY;");
    }
    if (guard.n === 0) {
      failed = true;
      console.error("The ensure_rls event trigger is missing. Apply lib/db/migrations/rls-guard.sql.");
    }
    if (!failed) console.log("RLS check passed: every public table has RLS on, and the guard is installed.");
    process.exitCode = failed ? 1 : 0;
  } finally {
    await sql.end();
  }
}

main(url).catch((err) => {
  console.error(err);
  process.exit(2);
});
