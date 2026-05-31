-- Settings table for app-wide configuration
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  description TEXT,
  is_public INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups by key
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category);

-- Seed initial settings
INSERT OR IGNORE INTO settings (key, value, category, description, is_public) VALUES
('app_name', 'Scratch Solid Solutions Portal', 'general', 'Application name', 1),
('app_version', '1.0.0', 'general', 'Application version', 1),
('maintenance_mode', '0', 'general', 'Maintenance mode (0=off, 1=on)', 1),
('default_currency', 'ZAR', 'general', 'Default currency code', 1),
('timezone', 'Africa/Johannesburg', 'general', 'Default timezone', 1),
('booking_confirmation_required', '1', 'bookings', 'Require confirmation for bookings', 0),
('auto_assign_bookings', '1', 'bookings', 'Auto-assign bookings to cleaners', 0),
('max_booking_per_day', '5', 'bookings', 'Maximum bookings per cleaner per day', 0),
('training_required_for_booking', '1', 'training', 'Require training completion before booking assignment', 0),
('kpi_threshold', '80', 'performance', 'KPI threshold for bonus eligibility', 0),
('notification_email_enabled', '1', 'notifications', 'Enable email notifications', 0),
('notification_sms_enabled', '0', 'notifications', 'Enable SMS notifications', 0),
('session_timeout_minutes', '60', 'security', 'Session timeout in minutes', 0),
('max_login_attempts', '5', 'security', 'Maximum login attempts before lockout', 0),
('lockout_duration_minutes', '30', 'security', 'Account lockout duration in minutes', 0);
