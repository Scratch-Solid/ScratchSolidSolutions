-- 052_create_missing_tables.sql
-- Catch-up migration for tables that were created outside the migration system
-- or were never created. Uses CREATE TABLE IF NOT EXISTS to be safe.

-- Quotes table
CREATE TABLE IF NOT EXISTS quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  service_id INTEGER,
  service_name TEXT,
  client_type TEXT,
  quantity INTEGER DEFAULT 1,
  baseline_price REAL,
  special_price REAL,
  special_label TEXT,
  special_discount REAL DEFAULT 0,
  promo_code TEXT,
  discount_type TEXT,
  discount_value REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  final_price REAL,
  status TEXT DEFAULT 'pending',
  zoho_estimate_number TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_quotes_ref_number ON quotes(ref_number);
CREATE INDEX IF NOT EXISTS idx_quotes_email ON quotes(email);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);

-- Promo codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  discount_value REAL NOT NULL DEFAULT 0,
  min_amount REAL,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  distribution_count INTEGER DEFAULT 0,
  last_distributed_at TEXT,
  distribution_channels TEXT DEFAULT '[]',
  valid_from TEXT,
  valid_until TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active);

-- Promo distribution tracking
CREATE TABLE IF NOT EXISTS promo_distribution (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  promo_code_id INTEGER NOT NULL,
  promo_code TEXT NOT NULL,
  channel TEXT NOT NULL,
  recipient_count INTEGER DEFAULT 1,
  distributed_by TEXT DEFAULT 'admin',
  notes TEXT,
  distributed_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_promo_distribution_promo_code_id ON promo_distribution(promo_code_id);

-- Marketing CMS content
CREATE TABLE IF NOT EXISTS marketing_cms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_key TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT DEFAULT 'admin'
);
CREATE INDEX IF NOT EXISTS idx_marketing_cms_key ON marketing_cms(content_key);
CREATE INDEX IF NOT EXISTS idx_marketing_cms_active ON marketing_cms(is_active);

-- Pricing configuration
CREATE TABLE IF NOT EXISTS pricing_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_type TEXT UNIQUE NOT NULL,
  base_price REAL NOT NULL DEFAULT 0,
  transport_fee REAL DEFAULT 0,
  weekend_surcharge REAL DEFAULT 0,
  holiday_surcharge REAL DEFAULT 0,
  rush_surcharge REAL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  effective_from TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT DEFAULT 'admin',
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_pricing_config_service ON pricing_config(service_type);

-- Staff public profiles (for client dashboards)
CREATE TABLE IF NOT EXISTS staff_public_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  profile_picture TEXT,
  bio TEXT,
  specialties TEXT,
  rating REAL DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_staff_public_profiles_user_id ON staff_public_profiles(user_id);

-- API response cache
CREATE TABLE IF NOT EXISTS api_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cache_key TEXT UNIQUE NOT NULL,
  cache_value TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_api_cache_key ON api_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_api_cache_expires ON api_cache(expires_at);

-- Application settings
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  updated_by TEXT DEFAULT 'system',
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- Contract versions
CREATE TABLE IF NOT EXISTS contract_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active INTEGER DEFAULT 0,
  effective_from TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Notification preferences per user
CREATE TABLE IF NOT EXISTS notification_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  whatsapp INTEGER DEFAULT 1,
  email INTEGER DEFAULT 1,
  push INTEGER DEFAULT 1,
  sms INTEGER DEFAULT 0,
  marketing INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- WhatsApp conversation sessions
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone_number TEXT NOT NULL,
  waba_id TEXT,
  job_id TEXT,
  conversation_started_at TEXT,
  conversation_expires_at TEXT,
  last_message_at TEXT,
  message_count_inbound INTEGER DEFAULT 0,
  message_count_outbound INTEGER DEFAULT 0,
  window_status TEXT DEFAULT 'closed',
  fallback_email_sent INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_phone ON whatsapp_sessions(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_job ON whatsapp_sessions(job_id);

-- Property templates for checklist generation
CREATE TABLE IF NOT EXISTS property_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_type TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  estimated_duration_minutes INTEGER,
  rooms_json TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_property_templates_type ON property_templates(property_type);
