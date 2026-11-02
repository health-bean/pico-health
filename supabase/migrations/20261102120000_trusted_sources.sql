-- Trusted sources: the admin-managed list of sites, APIs and datasets the app
-- is allowed to rely on. Food ratings and the coach cite only from this list.
-- Written only by the server (Drizzle, DB owner); RLS on with no policies keeps
-- it unreadable through the public Supabase API.
create table if not exists trusted_sources (
  id uuid primary key default gen_random_uuid(),
  name varchar(200) not null,
  url varchar(500) not null,
  -- Food properties this source is trusted for, e.g. {histamine,amines}
  trusted_for text[] not null default '{}',
  -- 'data' = ratings may cite it; 'reference' = background reading only
  use_as varchar(20) not null default 'data',
  notes text,
  is_active boolean not null default true,
  created_by varchar(120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trusted_sources_use_as_check check (use_as in ('data', 'reference'))
);

create unique index if not exists trusted_sources_name_idx on trusted_sources (name);

alter table trusted_sources enable row level security;

-- Starting list (2026-11-02 decisions): PubMed for research, SIGHI for histamine.
insert into trusted_sources (name, url, trusted_for, use_as, notes, created_by)
values
  ('PubMed', 'https://pubmed.ncbi.nlm.nih.gov',
   '{oxalate,histamine,lectin,nightshade,fodmap,salicylate,amines,glutamates,sulfites,goitrogens,purines,phytoestrogens,phytates,tyramine}',
   'data',
   'Peer-reviewed research. Prefer the most recent measurement; older studies only as references when newer data exists.',
   'seed'),
  ('SIGHI', 'https://histaminintoleranz.ch/en/downloads.html',
   '{histamine,amines}',
   'data',
   'Swiss Interest Group Histamine Intolerance food compatibility list. Tolerance scores (0-3) from clinical experience, not lab measurements. Use the detailed list, not the simplified one.',
   'seed')
on conflict do nothing;
