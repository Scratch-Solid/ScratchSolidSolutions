-- Cleaner Signup & Onboarding Tables
-- Migration for scratchsolid-portal-db (production)

-- new_joiners table - stores pending cleaner applications
CREATE TABLE IF NOT EXISTS new_joiners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  id_number TEXT NOT NULL, -- encrypted
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp TEXT,
  address TEXT NOT NULL,
  emergency_contact TEXT NOT NULL,
  bank_details TEXT NOT NULL, -- encrypted
  signature_id TEXT, -- DocuSign signature ID
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  erpnext_employee_id TEXT, -- FK to ERPNext employee after approval
  rejection_reason TEXT,
  approved_by INTEGER, -- user_id of admin who approved
  approved_at TEXT,
  rejected_by INTEGER, -- user_id of admin who rejected
  rejected_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- training_progress table - tracks cleaner training completion
CREATE TABLE IF NOT EXISTS training_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id TEXT NOT NULL, -- ERPNext employee ID
  modules_completed TEXT, -- JSON array of completed module IDs
  modules_pending TEXT, -- JSON array of pending module IDs
  completion_percentage INTEGER DEFAULT 0,
  completed INTEGER DEFAULT 0,
  background_check_consent INTEGER DEFAULT 0,
  background_check_consent_at TEXT,
  contract_signed INTEGER DEFAULT 0,
  contract_signed_at TEXT,
  contract_signature_id TEXT, -- DocuSign signature ID
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- login_activity table - tracks cleaner login activity
CREATE TABLE IF NOT EXISTS login_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL, -- FK to users table
  stage TEXT NOT NULL, -- 'pre_dashboard', 'cleaner_dashboard'
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  success INTEGER DEFAULT 1,
  ip_address TEXT,
  user_agent TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- audit_logs table - comprehensive audit trail for cleaner onboarding
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER, -- FK to users table (nullable for system actions)
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  details TEXT, -- JSON
  ip_address TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_new_joiners_status ON new_joiners(status);
CREATE INDEX IF NOT EXISTS idx_new_joiners_email ON new_joiners(email);
CREATE INDEX IF NOT EXISTS idx_new_joiners_id_number ON new_joiners(id_number);
CREATE INDEX IF NOT EXISTS idx_training_progress_employee_id ON training_progress(employee_id);
CREATE INDEX IF NOT EXISTS idx_login_activity_user_id ON login_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_login_activity_stage ON login_activity(stage);
CREATE INDEX IF NOT EXISTS idx_login_activity_timestamp ON login_activity(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
