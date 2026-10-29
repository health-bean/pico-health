-- Stripe webhook idempotency: one row per processed event id. The webhook
-- claims the id (INSERT ... ON CONFLICT DO NOTHING) before processing and
-- deletes it again if processing fails, so Stripe's retry runs.
-- Not yet applied. Run against production:
--   psql "$DATABASE_URL" -f supabase/migrations/20261028000000_stripe_webhook_events.sql

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id VARCHAR(255) PRIMARY KEY,           -- Stripe event.id (evt_...)
  type VARCHAR(100) NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS stripe_webhook_events_processed_at_idx
  ON stripe_webhook_events (processed_at);

-- Server-written only (Drizzle connects as owner and bypasses RLS); no client policies.
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;
