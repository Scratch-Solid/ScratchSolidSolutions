-- Migration: Client Preferences
-- Add client preferences table and extend client_preferences table

CREATE TABLE IF NOT EXISTS client_preferences_extended (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  preferred_cleaner_id INTEGER,
  preferred_time_slot TEXT, -- 'morning', 'afternoon', 'evening'
  notification_preferences TEXT DEFAULT '{}', -- JSON: {whatsapp: true, sms: false, email: true}
  language_preference TEXT DEFAULT 'en',
  access_notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (preferred_cleaner_id) REFERENCES users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_client_preferences_extended_user_id ON client_preferences_extended(user_id);
CREATE INDEX IF NOT EXISTS idx_client_preferences_extended_preferred_cleaner ON client_preferences_extended(preferred_cleaner_id);
