-- Migration: Create quote_requests table only (promo_codes already exists)
-- Run with: npx wrangler d1 execute scratchsolid-db --remote --file=migrations/create_quote_requests.sql

-- Quote requests (created by public users, no auth required)
CREATE TABLE IF NOT EXISTS quote_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  service_id INTEGER REFERENCES services(id),
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
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quote_requests_ref ON quote_requests(ref_number);
CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_quote_requests_email ON quote_requests(email);
