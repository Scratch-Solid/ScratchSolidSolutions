-- Migration: Promo Code Distribution Tracking
-- Run with: npx wrangler d1 execute scratchsolid-db --remote --file=migrations/add_promo_distribution_tracking.sql

-- Add distribution tracking columns to promo_codes table
ALTER TABLE promo_codes ADD COLUMN distribution_count INTEGER DEFAULT 0;
ALTER TABLE promo_codes ADD COLUMN last_distributed_at TEXT DEFAULT NULL;
ALTER TABLE promo_codes ADD COLUMN distribution_channels TEXT DEFAULT '[]'; -- JSON array of channels: ['email', 'print', 'social', 'qr']

-- Create a table for short URLs
CREATE TABLE IF NOT EXISTS short_urls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  short_code TEXT UNIQUE NOT NULL,
  target_url TEXT NOT NULL,
  promo_code_id INTEGER,
  promo_code TEXT NOT NULL,
  clicks INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id) ON DELETE CASCADE
);

-- Create indexes for short URLs
CREATE INDEX IF NOT EXISTS idx_short_urls_code ON short_urls(short_code);
CREATE INDEX IF NOT EXISTS idx_short_urls_promo_id ON short_urls(promo_code_id);

-- Create a separate table for QR code scan tracking
CREATE TABLE IF NOT EXISTS promo_scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  promo_code_id INTEGER NOT NULL,
  promo_code TEXT NOT NULL,
  scan_timestamp TEXT DEFAULT (datetime('now')),
  referrer TEXT DEFAULT '',
  user_agent TEXT DEFAULT '',
  ip_address TEXT DEFAULT '',
  location_country TEXT DEFAULT '',
  location_city TEXT DEFAULT '',
  FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id) ON DELETE CASCADE
);

-- Create indexes for scan tracking
CREATE INDEX IF NOT EXISTS idx_promo_scans_code_id ON promo_scans(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_promo_scans_code ON promo_scans(promo_code);
CREATE INDEX IF NOT EXISTS idx_promo_scans_timestamp ON promo_scans(scan_timestamp);

-- Create a table for distribution history
CREATE TABLE IF NOT EXISTS promo_distribution (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  promo_code_id INTEGER NOT NULL,
  promo_code TEXT NOT NULL,
  channel TEXT NOT NULL, -- 'email', 'print', 'social', 'qr', 'direct'
  recipient_count INTEGER DEFAULT 1,
  distributed_at TEXT DEFAULT (datetime('now')),
  distributed_by TEXT DEFAULT '', -- admin user who distributed
  notes TEXT DEFAULT '',
  FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id) ON DELETE CASCADE
);

-- Create indexes for distribution history
CREATE INDEX IF NOT EXISTS idx_promo_distribution_code_id ON promo_distribution(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_promo_distribution_code ON promo_distribution(promo_code);
CREATE INDEX IF NOT EXISTS idx_promo_distribution_channel ON promo_distribution(channel);
CREATE INDEX IF NOT EXISTS idx_promo_distribution_date ON promo_distribution(distributed_at);
