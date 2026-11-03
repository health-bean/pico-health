-- Macros and sugars per 100 g for curated foods, from each food's matched
-- USDA FoodData Central record (public domain). USDA foods are not added.
CREATE TABLE IF NOT EXISTS food_nutrients (
  food_id uuid PRIMARY KEY REFERENCES foods(id) ON DELETE CASCADE,
  fdc_id integer NOT NULL,
  data_type varchar(30) NOT NULL,
  description text NOT NULL,
  per_100g jsonb NOT NULL,
  match_confidence varchar(10) NOT NULL,
  match_note text,
  fetched_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE food_nutrients ENABLE ROW LEVEL SECURITY;
