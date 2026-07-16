-- Staging's consent_records table predates the current code (which expects
-- consent_date and created_at, matching production's shape) and instead has
-- consented_at/consent_version/withdrawn_at from an older design. Adding the
-- columns the code actually writes to, found live while testing the cleaner
-- onboarding flow end-to-end (background-check-consent step failed with
-- "no column named consent_date").
ALTER TABLE consent_records ADD COLUMN consent_date DATETIME DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE consent_records ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;
