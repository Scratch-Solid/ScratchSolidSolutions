-- Migration 032 was recorded as "applied" in both staging and production's
-- d1_migrations tracking table, but production's staff table is missing
-- training_completed, contract_url, onboarding_stage, and hired_at entirely
-- (only department made it through) - the same "recorded applied but never
-- actually executed" failure mode found earlier with migration 050.
-- Confirmed staging is equally missing all four columns, so this is safe to
-- apply identically to both environments.
ALTER TABLE staff ADD COLUMN training_completed INTEGER DEFAULT 0;
ALTER TABLE staff ADD COLUMN contract_url TEXT;
ALTER TABLE staff ADD COLUMN onboarding_stage TEXT DEFAULT 'consent_pending';
ALTER TABLE staff ADD COLUMN hired_at TEXT;

CREATE INDEX IF NOT EXISTS idx_staff_training_completed ON staff(training_completed);
CREATE INDEX IF NOT EXISTS idx_staff_onboarding_stage ON staff(onboarding_stage);
