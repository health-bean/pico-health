-- Per-request AI usage accounting: exact token counts by user, task, and model,
-- so per-user cost is measured, not estimated.

CREATE TABLE IF NOT EXISTS usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task varchar(40) NOT NULL,
  provider varchar(20) NOT NULL,
  model varchar(60) NOT NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  cache_read_input_tokens integer NOT NULL DEFAULT 0,
  cache_creation_input_tokens integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS usage_log_user_created_idx ON usage_log (user_id, created_at);
CREATE INDEX IF NOT EXISTS usage_log_created_idx ON usage_log (created_at);

ALTER TABLE usage_log ENABLE ROW LEVEL SECURITY;
-- Server-written only (Drizzle connects as owner and bypasses RLS); no client policies needed.
