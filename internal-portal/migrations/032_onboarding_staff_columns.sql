-- 032_onboarding_staff_columns.sql
-- Add onboarding-specific columns to staff table
-- This migration adds columns needed for the cleaner onboarding flow

-- Add training completion tracking
ALTER TABLE staff ADD COLUMN training_completed INTEGER DEFAULT 0;
-- 0 = not completed, 1 = completed

-- Add contract URL for signed contracts stored in R2
ALTER TABLE staff ADD COLUMN contract_url TEXT;

-- Add department for pool_type mapping
ALTER TABLE staff ADD COLUMN department TEXT DEFAULT 'cleaning';

-- Add onboarding stage tracking (redundant with users table for easier queries)
ALTER TABLE staff ADD COLUMN onboarding_stage TEXT DEFAULT 'consent_pending';
-- Possible values: 'consent_pending', 'profile_created', 'contract_signed', 'training_completed', 'active'

-- Add hired date for tracking
ALTER TABLE staff ADD COLUMN hired_at TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_training_completed ON staff(training_completed);
CREATE INDEX IF NOT EXISTS idx_staff_onboarding_stage ON staff(onboarding_stage);
CREATE INDEX IF NOT EXISTS idx_staff_department ON staff(department);
