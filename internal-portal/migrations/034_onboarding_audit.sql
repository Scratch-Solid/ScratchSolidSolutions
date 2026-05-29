-- 034_onboarding_audit.sql
-- Create onboarding_audit table for tracking stage transitions
-- This migration adds audit logging for the onboarding state machine

-- Create onboarding_audit table
CREATE TABLE IF NOT EXISTS onboarding_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'stage_transition', 'profile_created', 'contract_signed', 'training_completed', etc.
  metadata TEXT, -- JSON string with additional context
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_onboarding_audit_user_id ON onboarding_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_audit_to_stage ON onboarding_audit(to_stage);
CREATE INDEX IF NOT EXISTS idx_onboarding_audit_created_at ON onboarding_audit(created_at);
CREATE INDEX IF NOT EXISTS idx_onboarding_audit_event_type ON onboarding_audit(event_type);
