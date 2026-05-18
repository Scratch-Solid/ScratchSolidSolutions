-- Portal Database POPIA Compliance Tables
-- Migration for scratchsolid-portal-db (production)

-- Data deletion requests table
CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  request_type TEXT NOT NULL, -- 'account', 'specific_data'
  data_categories TEXT, -- JSON array of data types to delete
  reason TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'rejected'
  processed_at TEXT,
  processed_by INTEGER,
  rejection_reason TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (processed_by) REFERENCES users(id)
);

-- GPS consent table
CREATE TABLE IF NOT EXISTS gps_consent (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  consent_given INTEGER NOT NULL,
  consent_date TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  opt_out_date TEXT,
  opt_out_reason TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_user_id ON data_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_status ON data_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_created_at ON data_deletion_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_gps_consent_user_id ON gps_consent(user_id);
