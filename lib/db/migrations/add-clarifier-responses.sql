-- Clarifier responses: per (user, food, dimension) memory for follow-up questions.
-- Run against production: psql $DATABASE_URL -f lib/db/migrations/add-clarifier-responses.sql
-- Spec: docs/superpowers/specs/2026-09-03-clarifiers-design.md

CREATE TABLE IF NOT EXISTS clarifier_responses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  food_id       UUID NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
  dimension     VARCHAR(20) NOT NULL,
  answer        VARCHAR(200),
  answer_count  INTEGER NOT NULL DEFAULT 0,
  skip_count    INTEGER NOT NULL DEFAULT 0,
  last_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS clarifier_responses_user_food_dimension_idx
  ON clarifier_responses (user_id, food_id, dimension);

CREATE INDEX IF NOT EXISTS clarifier_responses_user_last_at_idx
  ON clarifier_responses (user_id, last_at);

-- RLS on for parity with other user tables (Drizzle connects as owner and bypasses it;
-- every query filters by user_id in the route handler).
ALTER TABLE clarifier_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS clarifier_responses_owner ON clarifier_responses;
CREATE POLICY clarifier_responses_owner ON clarifier_responses
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
