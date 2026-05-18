-- Portal Database Compliance & Training Tables
-- Migration for scratchsolid-portal-db (production)

-- Compliance checks table
CREATE TABLE IF NOT EXISTS compliance_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  check_type TEXT NOT NULL, -- 'background', 'certification', 'training', 'license'
  status TEXT DEFAULT 'pending', -- 'pending', 'passed', 'failed', 'expired'
  expiry_date TEXT,
  document_url TEXT,
  notes TEXT,
  checked_by INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (checked_by) REFERENCES users(id)
);

-- Training records table
CREATE TABLE IF NOT EXISTS training_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  training_name TEXT NOT NULL,
  training_type TEXT, -- 'safety', 'compliance', 'skill', 'onboarding'
  completion_date TEXT,
  expiry_date TEXT,
  certificate_url TEXT,
  status TEXT DEFAULT 'incomplete', -- 'incomplete', 'completed', 'expired'
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Certifications table
CREATE TABLE IF NOT EXISTS certifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  certification_name TEXT NOT NULL,
  issuing_organization TEXT,
  certification_number TEXT,
  issue_date TEXT,
  expiry_date TEXT,
  document_url TEXT,
  status TEXT DEFAULT 'active', -- 'active', 'expired', 'revoked'
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_compliance_checks_user_id ON compliance_checks(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_status ON compliance_checks(status);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_expiry ON compliance_checks(expiry_date);
CREATE INDEX IF NOT EXISTS idx_training_records_user_id ON training_records(user_id);
CREATE INDEX IF NOT EXISTS idx_training_records_status ON training_records(status);
CREATE INDEX IF NOT EXISTS idx_training_records_expiry ON training_records(expiry_date);
CREATE INDEX IF NOT EXISTS idx_certifications_user_id ON certifications(user_id);
CREATE INDEX IF NOT EXISTS idx_certifications_status ON certifications(status);
CREATE INDEX IF NOT EXISTS idx_certifications_expiry ON certifications(expiry_date);
