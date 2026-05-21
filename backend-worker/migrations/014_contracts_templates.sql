-- 014_contracts_templates.sql
-- Create contracts and templates tables
-- These tables are used in src/index.js but were never created by any backend migration
-- They exist in production from the original schema.sql bootstrap

CREATE TABLE IF NOT EXISTS templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  content TEXT DEFAULT '',
  created_by INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL REFERENCES users(id),
  template_id INTEGER REFERENCES templates(id),
  business_name TEXT NOT NULL DEFAULT '',
  contract_type TEXT DEFAULT 'standard',
  rate_per_hour REAL NOT NULL DEFAULT 0,
  duration TEXT DEFAULT NULL,
  rate REAL DEFAULT 0,
  immutable INTEGER DEFAULT 0,
  start_date TEXT DEFAULT CURRENT_TIMESTAMP,
  end_date TEXT DEFAULT NULL,
  status TEXT DEFAULT 'active',
  terms TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_templates_name ON templates(name);
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON templates(created_by);
CREATE INDEX IF NOT EXISTS idx_contracts_business_id ON contracts(business_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_template_id ON contracts(template_id);
CREATE INDEX IF NOT EXISTS idx_contracts_start_date ON contracts(start_date);
