-- Marketing Database Quotes Tables
-- Migration for scratchsolid-marketing-db (production)

-- Quote requests table
CREATE TABLE IF NOT EXISTS quote_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  service_id INTEGER,
  service_name TEXT DEFAULT '',
  quantity REAL DEFAULT 1,
  unit TEXT DEFAULT '',
  baseline_price REAL NOT NULL DEFAULT 0,
  promo_code TEXT DEFAULT '',
  discount_type TEXT DEFAULT '',
  discount_value REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  final_price REAL NOT NULL DEFAULT 0,
  zoho_estimate_id TEXT DEFAULT '',
  zoho_estimate_number TEXT DEFAULT '',
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'accepted', 'declined'
  notes TEXT DEFAULT '',
  valid_until TEXT DEFAULT (datetime('now', '+30 days')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (service_id) REFERENCES services(id)
);

-- Quotes table
CREATE TABLE IF NOT EXISTS quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref_number TEXT UNIQUE NOT NULL,
  zoho_estimate_number TEXT DEFAULT '',
  name TEXT NOT NULL,
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  service_id INTEGER NOT NULL,
  service_name TEXT NOT NULL,
  client_type TEXT DEFAULT 'individual',
  quantity INTEGER DEFAULT 1,
  baseline_price REAL NOT NULL,
  special_price REAL DEFAULT NULL,
  special_label TEXT DEFAULT '',
  special_discount REAL DEFAULT 0,
  promo_code TEXT DEFAULT '',
  discount_type TEXT DEFAULT '',
  discount_value REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  final_price REAL NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'expired'
  expires_at TEXT DEFAULT (datetime('now', '+14 days')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

-- Quote logs table
CREATE TABLE IF NOT EXISTS quote_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quote_request_id INTEGER,
  quote_id INTEGER,
  action TEXT NOT NULL, -- 'created', 'viewed', 'sent', 'accepted', 'declined', 'expired'
  details TEXT, -- JSON details
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (quote_request_id) REFERENCES quote_requests(id) ON DELETE SET NULL,
  FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_quote_requests_ref ON quote_requests(ref_number);
CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_quote_requests_email ON quote_requests(email);
CREATE INDEX IF NOT EXISTS idx_quote_requests_service_id ON quote_requests(service_id);
CREATE INDEX IF NOT EXISTS idx_quotes_ref_number ON quotes(ref_number);
CREATE INDEX IF NOT EXISTS idx_quotes_service_id ON quotes(service_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_expires_at ON quotes(expires_at);
CREATE INDEX IF NOT EXISTS idx_quote_logs_quote_request_id ON quote_logs(quote_request_id);
CREATE INDEX IF NOT EXISTS idx_quote_logs_quote_id ON quote_logs(quote_id);
