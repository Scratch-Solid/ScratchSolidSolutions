-- Portal Database Consent Forms Tables
-- Migration for scratchsolid-portal-db (production)

-- Consent form content table
CREATE TABLE IF NOT EXISTS consent_form_content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  form_type TEXT NOT NULL, -- 'popia', 'privacy', 'terms', 'cleaning'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  version INTEGER NOT NULL,
  effective_date TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Contract content table
CREATE TABLE IF NOT EXISTS contract_content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_type TEXT NOT NULL, -- 'employment', 'service', 'nda'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  version INTEGER NOT NULL,
  effective_date TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_consent_form_content_type ON consent_form_content(form_type);
CREATE INDEX IF NOT EXISTS idx_consent_form_content_version ON consent_form_content(form_type, version);
CREATE INDEX IF NOT EXISTS idx_contract_content_type ON contract_content(contract_type);
CREATE INDEX IF NOT EXISTS idx_contract_content_version ON contract_content(contract_type, version);
