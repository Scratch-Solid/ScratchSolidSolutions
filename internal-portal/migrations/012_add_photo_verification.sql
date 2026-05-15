-- Migration: Photo Verification
-- Add tables for photo verification during cleaning

CREATE TABLE IF NOT EXISTS cleaning_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  cleaner_id INTEGER NOT NULL,
  photo_url TEXT NOT NULL,
  photo_type TEXT NOT NULL, -- 'before', 'during', 'after', 'issue'
  description TEXT,
  uploaded_at TEXT NOT NULL,
  verified INTEGER DEFAULT 0,
  verified_by INTEGER,
  verified_at TEXT,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (cleaner_id) REFERENCES users(id),
  FOREIGN KEY (verified_by) REFERENCES users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cleaning_photos_booking_id ON cleaning_photos(booking_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_photos_cleaner_id ON cleaning_photos(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_photos_type ON cleaning_photos(photo_type);
