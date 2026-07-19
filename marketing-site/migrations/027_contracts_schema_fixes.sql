-- Fixes a real production bug found via static code audit (2026-07-19,
-- no live schema access available): migration 019 created `contracts`
-- with columns that never matched what src/app/api/contracts/route.ts
-- actually writes, and `weekend_assignments` was never created by any
-- migration at all. Creating a business contract - and the weekend-
-- assignment workflow tied to it - has been throwing "no such column" /
-- "no such table" on the very first call since 019 first ran.

ALTER TABLE contracts ADD COLUMN business_name TEXT;
ALTER TABLE contracts ADD COLUMN contract_type TEXT;
ALTER TABLE contracts ADD COLUMN rate_per_hour REAL;
ALTER TABLE contracts ADD COLUMN weekend_rate_multiplier REAL;
ALTER TABLE contracts ADD COLUMN weekend_required INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS weekend_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL,
  contract_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_cleaner_id INTEGER,
  assigned_cleaner_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contract_id) REFERENCES contracts(id)
);

CREATE INDEX IF NOT EXISTS idx_weekend_assignments_contract_id ON weekend_assignments(contract_id);
CREATE INDEX IF NOT EXISTS idx_weekend_assignments_business_id ON weekend_assignments(business_id);
