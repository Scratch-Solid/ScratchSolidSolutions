-- Migration: POPIA Compliance Features
-- Add tables for data deletion requests and GPS consent tracking

-- Data deletion requests table
CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  email TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, rejected
  requested_at TEXT NOT NULL,
  processed_at TEXT,
  rejection_reason TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- GPS consent tracking table
CREATE TABLE IF NOT EXISTS gps_consent (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  consent_given INTEGER DEFAULT 0, -- 0 = not given, 1 = given
  consent_date TEXT,
  consent_version TEXT DEFAULT '1.0',
  consent_ip TEXT,
  withdrawal_date TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add GPS consent column to client_preferences
ALTER TABLE client_preferences ADD COLUMN gps_tracking_consent INTEGER DEFAULT 0;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_user_id ON data_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_status ON data_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_gps_consent_user_id ON gps_consent(user_id);
