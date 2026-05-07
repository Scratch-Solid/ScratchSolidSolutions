-- Create password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  token TEXT UNIQUE NOT NULL,
  otp TEXT DEFAULT NULL,
  method TEXT NOT NULL, -- 'whatsapp' or 'email'
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
