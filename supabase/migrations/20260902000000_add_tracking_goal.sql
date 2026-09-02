-- Tracking goal for the capture loop's mandate strip ("Day 12 of 30").
-- Nullable: users without a practitioner mandate simply have no goal set.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tracking_goal_days integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tracking_goal_start_date date;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_tracking_goal_days_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_tracking_goal_days_check
  CHECK (tracking_goal_days IS NULL OR tracking_goal_days BETWEEN 7 AND 365);
