-- Marketing Database Promotions Tables
-- Migration for scratchsolid-marketing-db (production)

-- Promo codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  discount_type TEXT DEFAULT 'percentage', -- 'percentage' or 'fixed'
  discount_value REAL NOT NULL,
  min_amount REAL DEFAULT NULL,
  max_uses INTEGER DEFAULT NULL,
  used_count INTEGER DEFAULT 0,
  valid_from TEXT DEFAULT NULL,
  valid_until TEXT DEFAULT NULL,
  is_active INTEGER DEFAULT 1,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Promotions table
CREATE TABLE IF NOT EXISTS promotions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  discount_type TEXT DEFAULT 'percentage',
  discount_value REAL NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Referral rewards table
CREATE TABLE IF NOT EXISTS referral_rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  referrer_id INTEGER NOT NULL,
  referee_id INTEGER,
  reward_type TEXT NOT NULL, -- 'discount', 'credit', 'service'
  reward_value REAL NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'awarded', 'expired'
  awarded_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (referee_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Promo distribution tracking table
CREATE TABLE IF NOT EXISTS promo_distribution (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  promo_code_id INTEGER NOT NULL,
  channel TEXT NOT NULL, -- 'email', 'sms', 'social', 'qr'
  distribution_count INTEGER DEFAULT 0,
  scan_count INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id) ON DELETE CASCADE
);

-- Short URLs table
CREATE TABLE IF NOT EXISTS short_urls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  original_url TEXT NOT NULL,
  short_code TEXT UNIQUE NOT NULL,
  promo_code_id INTEGER,
  click_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT,
  FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id) ON DELETE SET NULL
);

-- Promo scans table
CREATE TABLE IF NOT EXISTS promo_scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  short_url_id INTEGER NOT NULL,
  scanned_at TEXT DEFAULT (datetime('now')),
  ip_address TEXT,
  user_agent TEXT,
  FOREIGN KEY (short_url_id) REFERENCES short_urls(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_is_active ON promo_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer_id ON referral_rewards(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_status ON referral_rewards(status);
CREATE INDEX IF NOT EXISTS idx_promo_distribution_promo_code_id ON promo_distribution(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_short_urls_short_code ON short_urls(short_code);
CREATE INDEX IF NOT EXISTS idx_promo_scans_short_url_id ON promo_scans(short_url_id);
