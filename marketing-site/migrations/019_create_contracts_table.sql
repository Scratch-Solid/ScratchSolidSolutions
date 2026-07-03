-- Create contracts table for business contract verification
CREATE TABLE IF NOT EXISTS contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL,
  contract_number TEXT UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
  start_date TEXT,
  end_date TEXT,
  is_immutable INTEGER DEFAULT 0,
  service_types TEXT, -- JSON array
  monthly_value REAL DEFAULT 0,
  terms TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_contracts_business_id ON contracts(business_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
