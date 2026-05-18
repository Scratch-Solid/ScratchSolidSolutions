-- Portal Database Operational Features Tables
-- Migration for scratchsolid-portal-db (production)

-- Voice notes table
CREATE TABLE IF NOT EXISTS voice_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  booking_id INTEGER,
  audio_url TEXT NOT NULL,
  duration INTEGER, -- in seconds
  transcript TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
);

-- SMS fallback logs table
CREATE TABLE IF NOT EXISTS sms_fallback_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'sent', -- 'sent', 'failed', 'delivered'
  error_message TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Cleaning checklists table
CREATE TABLE IF NOT EXISTS cleaning_checklists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  checklist_type TEXT NOT NULL,
  total_items INTEGER NOT NULL,
  completed_items INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'skipped'
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- Checklist items table
CREATE TABLE IF NOT EXISTS checklist_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  checklist_id INTEGER NOT NULL,
  item_text TEXT NOT NULL,
  is_completed INTEGER DEFAULT 0,
  completed_at TEXT,
  completed_by INTEGER,
  photo_url TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (checklist_id) REFERENCES cleaning_checklists(id) ON DELETE CASCADE,
  FOREIGN KEY (completed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Client preferences extended table
CREATE TABLE IF NOT EXISTS client_preferences_extended (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  preferred_cleaner_id INTEGER,
  preferred_time_slot TEXT,
  special_instructions TEXT,
  access_instructions TEXT,
  pet_notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (preferred_cleaner_id) REFERENCES cleaner_profiles(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_voice_notes_user_id ON voice_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_notes_booking_id ON voice_notes(booking_id);
CREATE INDEX IF NOT EXISTS idx_sms_fallback_logs_user_id ON sms_fallback_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_checklists_booking_id ON cleaning_checklists(booking_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist_id ON checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_client_preferences_extended_user_id ON client_preferences_extended(user_id);
