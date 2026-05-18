-- Portal Database Authentication Tables (Better Auth)
-- Migration for scratchsolid-portal-db (production)

-- Better Auth sessions table
CREATE TABLE IF NOT EXISTS better_auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Better Auth accounts table
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

-- Better Auth users table
CREATE TABLE IF NOT EXISTS better_auth_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  email_verified INTEGER DEFAULT 0,
  name TEXT,
  image TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Better Auth verifications table
CREATE TABLE IF NOT EXISTS better_auth_verifications (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_better_auth_sessions_user_id ON better_auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_better_auth_sessions_expires_at ON better_auth_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_better_auth_accounts_user_id ON better_auth_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_better_auth_verifications_identifier ON better_auth_verifications(identifier);
CREATE INDEX IF NOT EXISTS idx_better_auth_verifications_expires_at ON better_auth_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
