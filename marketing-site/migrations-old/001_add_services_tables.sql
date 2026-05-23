-- Migration: Add services and service_pricing tables
-- This migration creates the proper service management structure

-- Services table
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  detailed_description TEXT DEFAULT '',
  base_price REAL DEFAULT 0,
  room_multiplier REAL DEFAULT 1.0,
  is_active INTEGER DEFAULT 1,
  icon TEXT DEFAULT '',
  display_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Service pricing table
CREATE TABLE IF NOT EXISTS service_pricing (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  min_quantity INTEGER DEFAULT 1,
  max_quantity INTEGER DEFAULT NULL,
  price REAL NOT NULL,
  unit TEXT DEFAULT 'service',
  client_type TEXT DEFAULT 'all', -- 'individual', 'business', 'all'
  special_price REAL DEFAULT NULL,
  special_label TEXT DEFAULT '',
  special_valid_from TEXT DEFAULT NULL,
  special_valid_until TEXT DEFAULT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

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
  created_by INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Quotes table
CREATE TABLE IF NOT EXISTS quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref_number TEXT UNIQUE NOT NULL,
  zoho_estimate_number TEXT DEFAULT '',
  name TEXT NOT NULL,
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  service_id INTEGER NOT NULL REFERENCES services(id),
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
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_services_is_active ON services(is_active);
CREATE INDEX IF NOT EXISTS idx_services_display_order ON services(display_order);
CREATE INDEX IF NOT EXISTS idx_service_pricing_service_id ON service_pricing(service_id);
CREATE INDEX IF NOT EXISTS idx_service_pricing_client_type ON service_pricing(client_type);
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_is_active ON promo_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_quotes_ref_number ON quotes(ref_number);
CREATE INDEX IF NOT EXISTS idx_quotes_service_id ON quotes(service_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_expires_at ON quotes(expires_at);
