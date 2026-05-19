-- 015_pricing_events_weekends.sql
-- Create pricing, business_events, and weekend_requests tables
-- These tables are used in src/index.js but were never created by any backend migration
-- They exist in production from the original schema.sql bootstrap

CREATE TABLE IF NOT EXISTS pricing (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_type TEXT NOT NULL,
  rate REAL NOT NULL,
  duration TEXT DEFAULT '',
  description TEXT DEFAULT '',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS business_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER REFERENCES users(id),
  event_type TEXT DEFAULT '',
  requested_date TEXT DEFAULT '',
  special_instructions TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS weekend_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER REFERENCES users(id),
  requested_date TEXT NOT NULL,
  special_instructions TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  assigned_cleaner_id INTEGER REFERENCES users(id),
  assigned_cleaner_name TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pricing_service_type ON pricing(service_type);
CREATE INDEX IF NOT EXISTS idx_pricing_is_active ON pricing(is_active);
CREATE INDEX IF NOT EXISTS idx_business_events_business_id ON business_events(business_id);
CREATE INDEX IF NOT EXISTS idx_business_events_status ON business_events(status);
CREATE INDEX IF NOT EXISTS idx_business_events_date ON business_events(requested_date);
CREATE INDEX IF NOT EXISTS idx_weekend_requests_business_id ON weekend_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_weekend_requests_status ON weekend_requests(status);
CREATE INDEX IF NOT EXISTS idx_weekend_requests_date ON weekend_requests(requested_date);
CREATE INDEX IF NOT EXISTS idx_weekend_requests_cleaner ON weekend_requests(assigned_cleaner_id);
