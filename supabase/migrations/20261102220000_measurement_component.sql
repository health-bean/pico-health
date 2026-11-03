-- FODMAP is several sugars with separate cutoffs; each lab result records
-- which one it measures (fructans, gos, lactose, excess_fructose, sorbitol,
-- mannitol, total_fodmap). Null for every other property.
ALTER TABLE food_measurements ADD COLUMN IF NOT EXISTS component varchar(30);
