-- Provenance for food trigger properties: where each rating came from,
-- and whether a practitioner has reviewed it. Insights are only as good
-- as this table's receipts.

ALTER TABLE food_trigger_properties ADD COLUMN IF NOT EXISTS sources jsonb;
ALTER TABLE food_trigger_properties ADD COLUMN IF NOT EXISTS review_status varchar(20) NOT NULL DEFAULT 'unreviewed';
ALTER TABLE food_trigger_properties ADD COLUMN IF NOT EXISTS reviewed_by varchar(120);
ALTER TABLE food_trigger_properties ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE food_trigger_properties ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE food_trigger_properties DROP CONSTRAINT IF EXISTS ftp_review_status_check;
ALTER TABLE food_trigger_properties ADD CONSTRAINT ftp_review_status_check
  CHECK (review_status IN ('unreviewed', 'ai_proposed', 'founder_set', 'practitioner_reviewed'));

-- The original 99 test rows were founder-entered without citations.
UPDATE food_trigger_properties SET review_status = 'founder_set'
  WHERE review_status = 'unreviewed' AND sources IS NULL;
