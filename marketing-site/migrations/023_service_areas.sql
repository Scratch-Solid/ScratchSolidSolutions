-- Admin-manageable service areas, replacing the hardcoded TRANSPORT_FEES map
-- in lib/pricing-engine.ts (kept as a fallback for calculateTransportFee()
-- when no database row matches - see calculateQuote's transportFeeOverride).
-- Seeded from the exact values that were hardcoded, so nothing changes for
-- existing areas; new ones can now be added from the admin dashboard.
CREATE TABLE IF NOT EXISTS service_areas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  transport_fee REAL NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

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
