-- Create users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client',
  name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  business_name TEXT DEFAULT '',
  business_registration TEXT DEFAULT '',
  business_info TEXT DEFAULT '',
  failed_attempts INTEGER DEFAULT 0,
  locked_until TEXT DEFAULT NULL,
  soft_delete_at TEXT DEFAULT NULL,
  deleted INTEGER DEFAULT 0,
  email_verified INTEGER DEFAULT 1,
  email_verification_token TEXT,
  email_verification_expires TEXT,
  email_verification_sent_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Create sessions table for auth token validation
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  token TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT DEFAULT (datetime('now', '+7 days'))
);

-- Create indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_deleted ON users(deleted);

-- Create indexes for sessions table
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- Insert default admin user (password: admin123 - bcrypt hash)
INSERT OR IGNORE INTO users (email, password_hash, role, name) VALUES
  ('admin@scratchsolid.com', '$2b$10$uwCmscm1QfaMDW4/vYVIP.YpT6dS/meNGQFp3GQrz5qclrRuhd1R2', 'admin', 'Admin User');
