-- Schema Hardening Migration
-- Adds missing indexes and documents admin_dashboard as a valid login_activity stage

-- login_activity stage now supports: 'pre_dashboard', 'cleaner_dashboard', 'admin_dashboard'
-- (SQLite comments only; app-level enforcement ensures valid stages)

-- Index for paysheet code lookups (used during approval for duplicate detection)
CREATE INDEX IF NOT EXISTS idx_cleaner_profiles_paysheet_code ON cleaner_profiles(paysheet_code);

-- Index for training progress lookups by user_id (common join path)
CREATE INDEX IF NOT EXISTS idx_training_progress_user_id ON training_progress(user_id);

-- Index for new_joiners phone lookups (used in signup duplicate checks)
CREATE INDEX IF NOT EXISTS idx_new_joiners_phone ON new_joiners(phone);

-- Index for consent_records consent_type queries
CREATE INDEX IF NOT EXISTS idx_consent_records_consent_type ON consent_records(consent_type);
