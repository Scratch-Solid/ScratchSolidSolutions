-- Structured service-area field for same-day area clustering (see
-- docs/area-clustering.md). Mirrors marketing-site's bookings.suburb so the
-- AUTO-pool assignment scorer (pool-assignment.ts) can prefer a cleaner who
-- already has a job in the same suburb that day.
ALTER TABLE bookings ADD COLUMN suburb TEXT;
CREATE INDEX IF NOT EXISTS idx_bookings_suburb_date ON bookings(suburb, booking_date);

-- jobs is the Cal.com-derived table (n8n ingestion path) - same field for
-- the same reason, populated from the Cal.com booking-question response.
-- scheduled_at is a full timestamp (not a plain date column).
ALTER TABLE jobs ADD COLUMN suburb TEXT;
CREATE INDEX IF NOT EXISTS idx_jobs_suburb_date ON jobs(suburb, scheduled_at);
