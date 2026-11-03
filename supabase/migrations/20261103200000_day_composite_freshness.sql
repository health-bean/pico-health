-- Insights cache a summary per user per day (day_composites). Until now a
-- day's summary was built once and never rebuilt, so logs added later
-- (an evening dinner, a symptom, a journal entry, a clarifier answer) never
-- reached insights. Now any change to a day's entries or journal drops that
-- day's summary, and the next insights run rebuilds it.

create or replace function public.drop_stale_day_composite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    delete from day_composites where user_id = old.user_id and date = old.entry_date;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    delete from day_composites where user_id = new.user_id and date = new.entry_date;
  end if;
  return null;
end;
$$;

drop trigger if exists timeline_entries_drop_day_composite on timeline_entries;
create trigger timeline_entries_drop_day_composite
  after insert or update or delete on timeline_entries
  for each row execute function public.drop_stale_day_composite();

drop trigger if exists journal_entries_drop_day_composite on journal_entries;
create trigger journal_entries_drop_day_composite
  after insert or update or delete on journal_entries
  for each row execute function public.drop_stale_day_composite();

-- Journal extras (meditation, cycle day, bedtime, movement) were computed
-- but never stored, so their insight factors never fired.
alter table day_composites add column if not exists journal_extras jsonb not null default '{}'::jsonb;
