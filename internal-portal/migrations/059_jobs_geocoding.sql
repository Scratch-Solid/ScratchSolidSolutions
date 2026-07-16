-- The jobs table (not bookings) is the actual Transparency Policy source of
-- truth, so geocoding belongs here - migration 058 added equivalent columns
-- to bookings before this was confirmed, and those are left as harmless
-- unused columns rather than risk a DROP COLUMN on live data.
ALTER TABLE jobs ADD COLUMN geocoded_lat REAL;
ALTER TABLE jobs ADD COLUMN geocoded_long REAL;
ALTER TABLE jobs ADD COLUMN geocoded_at TEXT;
