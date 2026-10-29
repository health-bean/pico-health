-- Early-access list for picohealth.app (the landing page and /join?ref=... links).
-- Written only by the server (Drizzle, DB owner); RLS on with no policies keeps it
-- unreadable through the public Supabase API.
create table if not exists waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email varchar(254) not null,
  ref varchar(40),
  created_at timestamptz not null default now(),
  invited_at timestamptz
);

-- Emails are stored lowercased by the API.
create unique index if not exists waitlist_signups_email_idx on waitlist_signups (email);

alter table waitlist_signups enable row level security;
