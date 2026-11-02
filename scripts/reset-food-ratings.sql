-- One-off (2026-11-02): reset every food rating to "unknown" so ratings are
-- rebuilt only from cited lab results (admin → Food data). Nightshade is kept:
-- it's a botanical yes/no, not a measurement.
--
-- Takes a full backup first. To undo:
--   UPDATE food_trigger_properties t SET
--     oxalate=b.oxalate, histamine=b.histamine, lectin=b.lectin, fodmap=b.fodmap,
--     salicylate=b.salicylate, amines=b.amines, glutamates=b.glutamates,
--     sulfites=b.sulfites, goitrogens=b.goitrogens, purines=b.purines,
--     phytoestrogens=b.phytoestrogens, phytates=b.phytates, tyramine=b.tyramine,
--     sources=b.sources, review_status=b.review_status, reviewed_by=b.reviewed_by,
--     reviewed_at=b.reviewed_at, updated_at=now()
--   FROM food_trigger_properties_backup_20261102 b WHERE b.id = t.id;
--
-- Run: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/reset-food-ratings.sql

BEGIN;

CREATE TABLE IF NOT EXISTS food_trigger_properties_backup_20261102 AS
  SELECT * FROM food_trigger_properties;
ALTER TABLE food_trigger_properties_backup_20261102 ENABLE ROW LEVEL SECURITY;

UPDATE food_trigger_properties SET
  oxalate = 'unknown', histamine = 'unknown', lectin = 'unknown', fodmap = 'unknown',
  salicylate = 'unknown', amines = 'unknown', glutamates = 'unknown', sulfites = 'unknown',
  goitrogens = 'unknown', purines = 'unknown', phytoestrogens = 'unknown',
  phytates = 'unknown', tyramine = 'unknown',
  sources = CASE WHEN sources ? 'nightshade'
                 THEN jsonb_build_object('nightshade', sources -> 'nightshade') END,
  review_status = 'unreviewed', reviewed_by = NULL, reviewed_at = NULL,
  updated_at = now();

SELECT
  (SELECT count(*) FROM food_trigger_properties_backup_20261102) AS backed_up,
  (SELECT count(*) FROM food_trigger_properties WHERE oxalate = 'unknown' AND histamine = 'unknown') AS reset,
  (SELECT count(*) FROM food_trigger_properties WHERE nightshade) AS nightshades_kept;

COMMIT;
