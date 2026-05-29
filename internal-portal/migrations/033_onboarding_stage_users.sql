-- 033_onboarding_stage_users.sql
-- Add onboarding_stage column to users table
-- This migration adds stage tracking to the users table for the onboarding state machine

-- Add onboarding_stage column
ALTER TABLE users ADD COLUMN onboarding_stage TEXT DEFAULT 'consent_pending';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_onboarding_stage ON users(onboarding_stage);

-- Possible values for onboarding_stage:
-- 'consent_pending' - Initial state, user has submitted consent form
-- 'consent_approved' - Admin has approved the consent
-- 'profile_created' - User has created their profile
-- 'contract_signed' - User has signed the contract
-- 'training_completed' - User has completed all training modules
-- 'active' - User is fully onboarded and active
-- 'rejected' - User was rejected during onboarding
