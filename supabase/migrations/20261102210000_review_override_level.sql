-- Lets an admin set a food's rating by hand (with a note) when the middle
-- value of the lab results misleads, e.g. blue cheese tyramine ranges from
-- not detected to 5,130 mg/kg.
ALTER TABLE food_property_reviews ADD COLUMN IF NOT EXISTS override_level varchar(20);
