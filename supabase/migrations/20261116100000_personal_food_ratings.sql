-- Personal food ratings: what a food does to *you*, kept apart from what the
-- food contains. Set by a reintroduction trial, by the person, or (later) by
-- an insight the person confirmed. Each carries the evidence behind it.
-- Reuses user_food_reactions (safe / sensitive / unsafe), which was unused.

alter table user_food_reactions
  add column if not exists source varchar(20) not null default 'self',
  add column if not exists evidence jsonb not null default '{}'::jsonb,
  add column if not exists amount_note text,
  add column if not exists updated_at timestamptz not null default now();

alter table user_food_reactions drop constraint if exists user_food_reactions_source_check;
alter table user_food_reactions
  add constraint user_food_reactions_source_check check (source in ('self', 'trial', 'insight'));

-- One rating per person per food.
create unique index if not exists user_food_reactions_user_food_id_idx
  on user_food_reactions (user_id, food_id) where food_id is not null;
