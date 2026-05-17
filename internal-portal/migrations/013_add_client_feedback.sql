-- Migration: Client Feedback During Cleaning
-- Add table for real-time client feedback during cleaning

CREATE TABLE IF NOT EXISTS cleaning_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  client_id INTEGER NOT NULL,
  cleaner_id INTEGER NOT NULL,
  feedback_type TEXT NOT NULL, -- 'rating', 'issue', 'comment', 'completion'
  rating INTEGER, -- 1-5 stars
  message TEXT,
  created_at TEXT NOT NULL,
  resolved INTEGER DEFAULT 0,
  resolved_at TEXT,
  resolved_by INTEGER,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES users(id),
  FOREIGN KEY (cleaner_id) REFERENCES users(id),
  FOREIGN KEY (resolved_by) REFERENCES users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cleaning_feedback_booking_id ON cleaning_feedback(booking_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_feedback_client_id ON cleaning_feedback(client_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_feedback_type ON cleaning_feedback(feedback_type);
