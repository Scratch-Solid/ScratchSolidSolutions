-- Shared tables needed by backend worker
-- These tables are referenced by backend worker code for retention policies, queue consumer, etc.

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  booking_id INTEGER,
  rating INTEGER NOT NULL DEFAULT 5,
  text TEXT NOT NULL,
  images TEXT DEFAULT '[]',
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Background images table
CREATE TABLE IF NOT EXISTS background_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  name TEXT NOT NULL,
  is_active INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  details TEXT, -- JSON details
  archived INTEGER DEFAULT 0,
  archived_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  token TEXT UNIQUE NOT NULL,
  otp TEXT DEFAULT NULL,
  method TEXT NOT NULL, -- 'whatsapp' or 'email'
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  type TEXT DEFAULT '',
  title TEXT DEFAULT '',
  message TEXT DEFAULT '',
  channel TEXT DEFAULT 'web', -- 'web', 'email', 'whatsapp', 'sms'
  status TEXT DEFAULT 'unread', -- 'unread', 'read', 'archived'
  created_at TEXT DEFAULT (datetime('now'))
);

-- Cleaner profiles table
CREATE TABLE IF NOT EXISTS cleaner_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  username TEXT UNIQUE NOT NULL,
  paysheet_code TEXT,
  first_name TEXT DEFAULT '',
  last_name TEXT DEFAULT '',
  residential_address TEXT DEFAULT '',
  cellphone TEXT DEFAULT '',
  tax_number TEXT DEFAULT '',
  profile_picture TEXT DEFAULT '',
  emergency_contact1_name TEXT DEFAULT '',
  emergency_contact1_phone TEXT DEFAULT '',
  emergency_contact2_name TEXT DEFAULT '',
  emergency_contact2_phone TEXT DEFAULT '',
  department TEXT DEFAULT 'cleaning',
  specialties TEXT DEFAULT '[]',
  rating REAL DEFAULT 0,
  status TEXT DEFAULT 'idle',
  blocked INTEGER DEFAULT 0,
  gps_lat REAL DEFAULT NULL,
  gps_long REAL DEFAULT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_cleaner_profiles_user_id ON cleaner_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_cleaner_profiles_username ON cleaner_profiles(username);
