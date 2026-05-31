-- Cleaner pools table for managing pool assignments
CREATE TABLE IF NOT EXISTS cleaner_pools (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  pool_type TEXT NOT NULL CHECK(pool_type IN ('INDIVIDUAL', 'BUSINESS')),
  description TEXT,
  max_cleaners INTEGER DEFAULT 10,
  current_cleaners INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cleaner_pools_type ON cleaner_pools(pool_type);
CREATE INDEX IF NOT EXISTS idx_cleaner_pools_status ON cleaner_pools(status);

-- Seed initial pools
INSERT OR IGNORE INTO cleaner_pools (name, pool_type, description, max_cleaners, current_cleaners, status) VALUES
('Individual Pool - Johannesburg', 'INDIVIDUAL', 'Pool for individual residential bookings in Johannesburg', 20, 0, 'active'),
('Individual Pool - Pretoria', 'INDIVIDUAL', 'Pool for individual residential bookings in Pretoria', 15, 0, 'active'),
('Business Pool - Gauteng', 'BUSINESS', 'Pool for business/commercial bookings in Gauteng', 10, 0, 'active');
