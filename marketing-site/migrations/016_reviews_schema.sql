-- Migration 016: Add missing review columns for admin moderation workflow
-- Reviews now support: text (renamed from comment), images JSON, booking_id linkage, status moderation

-- Add missing columns to reviews table (safe no-ops if already present)
ALTER TABLE reviews ADD COLUMN booking_id INTEGER;
ALTER TABLE reviews ADD COLUMN text TEXT;
ALTER TABLE reviews ADD COLUMN images TEXT DEFAULT '[]';
ALTER TABLE reviews ADD COLUMN status TEXT DEFAULT 'pending';

-- Migrate existing comment data into new text column
UPDATE reviews SET text = comment WHERE text IS NULL AND comment IS NOT NULL;

-- Set all existing reviews without a status to 'approved' so they remain visible
UPDATE reviews SET status = 'approved' WHERE status IS NULL OR status = '';

-- Add indexes for the new moderation workflow
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at);
