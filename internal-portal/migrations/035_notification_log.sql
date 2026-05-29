-- Create notification_log table for tracking all notifications sent
CREATE TABLE IF NOT EXISTS notification_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  phone_number TEXT,
  email TEXT,
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL, -- 'whatsapp' or 'email'
  template_name TEXT,
  status TEXT NOT NULL, -- 'sent', 'failed', 'pending'
  message_id TEXT,
  error_message TEXT,
  metadata TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_notification_log_user_id ON notification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_type ON notification_log(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON notification_log(status);
CREATE INDEX IF NOT EXISTS idx_notification_log_created_at ON notification_log(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_log_channel ON notification_log(channel);
