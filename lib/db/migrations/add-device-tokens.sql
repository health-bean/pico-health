-- Phones that asked for post-meal check-in reminders (push notifications).
-- A row is the opt-in; deleting it opts out. Cascades with the profile, so
-- account purges remove tokens too.
-- Run against production: psql $DATABASE_URL -f lib/db/migrations/add-device-tokens.sql

CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform VARCHAR(10) NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS device_tokens_user_idx ON device_tokens (user_id);

-- Same policy as every other user table: RLS on, no client access. The app
-- reaches this table only through route handlers that filter by user.
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
