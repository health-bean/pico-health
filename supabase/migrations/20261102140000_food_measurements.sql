-- Food measurements: one row per lab result (or per list rating) for one food
-- and one property, each tied to a trusted source and a citation. Food ratings
-- in food_trigger_properties are computed from these rows; see lib/food-data.
-- Written only by the server (Drizzle, DB owner); RLS on with no policies.

-- Standard serving, so amounts can be ranked per serving (oxalate is ranked
-- by mg per serving, like Sally K. Norton's tables).
alter table foods add column if not exists serving_grams numeric(7, 2);
alter table foods add column if not exists serving_label varchar(60);

create table if not exists food_measurements (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references foods(id) on delete cascade,
  property varchar(30) not null,
  -- Lab amount, e.g. 350 (mg per 100 g). Null for list sources like SIGHI.
  value_per_100g numeric(10, 3),
  unit varchar(20) not null default 'mg',
  -- Level as the source states it (list sources), e.g. 'high'.
  reported_level varchar(20),
  soluble_pct numeric(5, 2),
  -- How the tested sample was prepared, e.g. 'raw', 'boiled 6 min'.
  preparation varchar(120),
  -- How the study describes the sample, e.g. 'Almond, dry roasted, unsalted'.
  sample_description text,
  source_id uuid not null references trusted_sources(id),
  -- Full reference: authors, year, title, journal.
  citation text not null,
  -- DOI or PubMed link.
  citation_url varchar(500),
  study_year integer,
  -- Admin judgment: excluded rows stay visible but don't count.
  excluded boolean not null default false,
  exclusion_note text,
  created_by varchar(120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint food_measurements_property_check check (property in (
    'oxalate','histamine','lectin','nightshade','fodmap','salicylate','amines',
    'glutamates','sulfites','goitrogens','purines','phytoestrogens','phytates','tyramine')),
  constraint food_measurements_level_check check (
    reported_level is null or reported_level in ('none','low','moderate','high','very_high')),
  constraint food_measurements_has_value check (value_per_100g is not null or reported_level is not null),
  constraint food_measurements_value_check check (value_per_100g is null or value_per_100g >= 0),
  constraint food_measurements_soluble_check check (soluble_pct is null or (soluble_pct >= 0 and soluble_pct <= 100)),
  constraint food_measurements_year_check check (study_year is null or (study_year between 1900 and 2100))
);

create index if not exists food_measurements_food_property_idx on food_measurements (food_id, property);
create index if not exists food_measurements_source_idx on food_measurements (source_id);
alter table food_measurements enable row level security;

-- Admin sign-off on a food + property ("I've looked at the studies and the
-- rating is right"). Stale once any of that food's measurements change after it.
create table if not exists food_property_reviews (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references foods(id) on delete cascade,
  property varchar(30) not null,
  note text,
  reviewed_by varchar(120) not null,
  reviewed_at timestamptz not null default now()
);

create unique index if not exists food_property_reviews_food_property_idx
  on food_property_reviews (food_id, property);
alter table food_property_reviews enable row level security;
