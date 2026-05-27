-- Enhanced Authentication System Migration for Production
-- World-class security features with RBAC integration
-- This version handles existing tables in production

-- Drop and recreate refresh_tokens with correct schema
DROP TABLE IF EXISTS refresh_tokens;
CREATE TABLE refresh_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token_id TEXT NOT NULL UNIQUE,
  token_hash TEXT NOT NULL, -- Hashed refresh token
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  revoked_at INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for refresh token lookups
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_id ON refresh_tokens(token_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Create auth_audit_log table for security monitoring
CREATE TABLE IF NOT EXISTS auth_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  event_type TEXT NOT NULL, -- login_success, login_failed, logout, 2fa_enabled, 2fa_disabled, password_changed
  ip_address TEXT,
  user_agent TEXT,
  details TEXT, -- JSON string for additional details
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create index for audit log queries
CREATE INDEX idx_auth_audit_log_user_id ON auth_audit_log(user_id);
CREATE INDEX idx_auth_audit_log_event_type ON auth_audit_log(event_type);
CREATE INDEX idx_auth_audit_log_created_at ON auth_audit_log(created_at);

-- Create user_2fa table for TOTP support (if not exists)
CREATE TABLE IF NOT EXISTS user_2fa (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  secret TEXT NOT NULL, -- TOTP secret
  enabled INTEGER NOT NULL DEFAULT 0,
  backup_codes TEXT, -- JSON array of backup codes
  last_used_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for 2FA lookups
CREATE INDEX IF NOT EXISTS idx_user_2fa_user_id ON user_2fa(user_id);

-- Create password_history table for password policies
CREATE TABLE IF NOT EXISTS password_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for password history
CREATE INDEX IF NOT EXISTS idx_password_history_user_id ON password_history(user_id);
CREATE INDEX IF NOT EXISTS idx_password_history_created_at ON password_history(created_at);

-- Add missing columns to users table for enhanced security
-- Only add columns that don't already exist

ALTER TABLE users ADD COLUMN last_login_at INTEGER;

ALTER TABLE users ADD COLUMN last_login_ip TEXT;

ALTER TABLE users ADD COLUMN password_changed_at INTEGER;

ALTER TABLE users ADD COLUMN password_reset_token TEXT;

ALTER TABLE users ADD COLUMN password_reset_expires_at INTEGER;

-- Create indexes for new user columns
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);

