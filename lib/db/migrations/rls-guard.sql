-- Migration: RLS on every public table, now and in future
-- Date: 2026-11-10
--
-- Why: Supabase exposes every table in `public` through its REST API with the
-- anon key. A table without Row Level Security can be read, edited and deleted
-- by anyone with the project URL. On 2026-11-08 Supabase flagged two hand-made
-- backup tables from the Nov 2 food-data rebuild that had RLS off.
--
-- The app is unaffected: Drizzle connects as the table owner, which bypasses
-- RLS. Tables with RLS on and no policies are simply closed to the REST API.

-- 1. Close the two exposed backup tables.
ALTER TABLE IF EXISTS public.foods_merged_backup_20261102 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.food_trigger_properties_merged_backup_20261102 ENABLE ROW LEVEL SECURITY;

-- 2. Guard: any table created in `public` from now on gets RLS on at once,
--    however it is made (drizzle push, a script, CREATE TABLE AS in the SQL editor).
CREATE SCHEMA IF NOT EXISTS internal;
REVOKE ALL ON SCHEMA internal FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION internal.rls_auto_enable()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN
    SELECT * FROM pg_event_trigger_ddl_commands()
    WHERE object_type IN ('table', 'partitioned table')
      AND schema_name = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', obj.object_identity);
  END LOOP;
END;
$$;

DROP EVENT TRIGGER IF EXISTS ensure_rls;
CREATE EVENT TRIGGER ensure_rls
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION internal.rls_auto_enable();
