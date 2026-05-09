-- Session Activity Logging
CREATE TABLE IF NOT EXISTS session_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  method TEXT,
  path TEXT,
  status_code INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (session_id) REFERENCES better_auth_sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_session_activity_session_id ON session_activity(session_id);
CREATE INDEX IF NOT EXISTS idx_session_activity_user_id ON session_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_session_activity_created_at ON session_activity(created_at);
