-- Create contract_versions table for tracking contract template versions
CREATE TABLE IF NOT EXISTS contract_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version_number TEXT NOT NULL,
  template_content TEXT NOT NULL,
  effective_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  is_active BOOLEAN DEFAULT 1
);

-- Create signed_contracts table for tracking signed contract instances
CREATE TABLE IF NOT EXISTS signed_contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  contract_version_id INTEGER NOT NULL,
  pdf_url TEXT NOT NULL,
  signature_metadata TEXT,
  signed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (contract_version_id) REFERENCES contract_versions(id)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_contract_versions_active ON contract_versions(is_active);
CREATE INDEX IF NOT EXISTS idx_signed_contracts_user ON signed_contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_signed_contracts_version ON signed_contracts(contract_version_id);
