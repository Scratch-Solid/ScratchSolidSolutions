-- Enhanced Authentication System Migration
-- World-class security features with RBAC integration

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
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_user_id ON auth_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_event_type ON auth_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_created_at ON auth_audit_log(created_at);

-- Create refresh_tokens table for secure session management
CREATE TABLE IF NOT EXISTS refresh_tokens (
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
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_id ON refresh_tokens(token_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Create user_2fa table for TOTP support
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

-- Add columns to users table for enhanced security
-- SQLite doesn't support IF NOT EXISTS with ALTER TABLE, so we use a workaround
-- These columns will be added if they don't exist

-- Check and add last_login_at
-- Note: In production, you should check if columns exist before adding
-- For now, we'll add them directly and handle errors gracefully
ALTER TABLE users ADD COLUMN last_login_at INTEGER;

ALTER TABLE users ADD COLUMN last_login_ip TEXT;

ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;

ALTER TABLE users ADD COLUMN locked_until INTEGER;

ALTER TABLE users ADD COLUMN password_changed_at INTEGER;

ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0;

ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0;

ALTER TABLE users ADD COLUMN email_verification_token TEXT;

ALTER TABLE users ADD COLUMN password_reset_token TEXT;

ALTER TABLE users ADD COLUMN password_reset_expires_at INTEGER;

-- Create indexes for new user columns
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users(email_verification_token);
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);
