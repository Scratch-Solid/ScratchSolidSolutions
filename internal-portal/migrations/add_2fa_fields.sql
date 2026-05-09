-- Add 2FA fields to users table
ALTER TABLE users ADD COLUMN two_factor_enabled INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN totp_secret TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN backup_codes TEXT DEFAULT NULL;

-- Better Auth session tables
CREATE TABLE IF NOT EXISTS better_auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS better_auth_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS better_auth_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  email_verified INTEGER DEFAULT 0,
  name TEXT,
  image TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS better_auth_verifications (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON better_auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON better_auth_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON better_auth_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_verifications_identifier ON better_auth_verifications(identifier);
CREATE INDEX IF NOT EXISTS idx_verifications_expires_at ON better_auth_verifications(expires_at);
