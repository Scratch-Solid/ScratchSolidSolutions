-- Admin-manageable service areas, replacing the hardcoded TRANSPORT_FEES map
-- in lib/pricing-engine.ts (kept as a fallback for calculateTransportFee()
-- when no database row matches - see calculateQuote's transportFeeOverride).
-- Seeded from the exact values that were hardcoded, so nothing changes for
-- existing areas; new ones can now be added from the admin dashboard.
--
-- A service_areas table already exists in both staging and production from
-- an earlier, apparently abandoned feature (id, name, description,
-- coverage_area, base_price_modifier, is_active, created_at, updated_at -
-- zero rows in either environment). Rather than collide with that table
-- name, this extends it in place with the transport_fee column this feature
-- actually needs. D1/SQLite has no ALTER TABLE ADD COLUMN IF NOT EXISTS, so
-- this assumes the table already exists in that old shape - true in every
-- environment this has been checked against.
ALTER TABLE service_areas ADD COLUMN transport_fee REAL NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_service_areas_name_unique ON service_areas(name);
CREATE INDEX IF NOT EXISTS idx_service_areas_active ON service_areas(is_active);

INSERT OR IGNORE INTO service_areas (name, transport_fee) VALUES
  ('Durbanville', 50),
  ('Bellville', 45),
  ('Brackenfell', 55),
  ('Plattekloof', 50),
  ('Tygervalley', 45),
  ('Parow', 40),
  ('Goodwood', 40),
  ('Kuils River', 60),
  ('Kraaifontein', 65),
  ('Stellenbosch', 70),
  ('Paarl', 80),
  ('Wellington', 85);
