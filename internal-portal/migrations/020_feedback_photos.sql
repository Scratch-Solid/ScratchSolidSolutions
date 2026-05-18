-- Portal Database Feedback & Photos Tables
-- Migration for scratchsolid-portal-db (production)

-- Cleaning feedback table
CREATE TABLE IF NOT EXISTS cleaning_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  client_id INTEGER NOT NULL,
  cleaner_id INTEGER,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  issues TEXT, -- JSON array of issues
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (cleaner_id) REFERENCES cleaner_profiles(id) ON DELETE SET NULL
);

-- Cleaning photos table
CREATE TABLE IF NOT EXISTS cleaning_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  photo_url TEXT NOT NULL,
  photo_type TEXT NOT NULL, -- 'before', 'after', 'during'
  uploaded_by INTEGER NOT NULL,
  caption TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- Push subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  endpoint TEXT NOT NULL,
  keys TEXT NOT NULL, -- JSON object with p256dh and auth keys
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cleaning_feedback_booking_id ON cleaning_feedback(booking_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_feedback_client_id ON cleaning_feedback(client_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_feedback_cleaner_id ON cleaning_feedback(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_feedback_rating ON cleaning_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_cleaning_photos_booking_id ON cleaning_photos(booking_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_photos_type ON cleaning_photos(photo_type);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
