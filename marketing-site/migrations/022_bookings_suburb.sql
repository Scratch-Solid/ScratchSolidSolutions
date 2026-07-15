-- Structured service-area field for same-day area clustering (see
-- docs/area-clustering.md). `location` stays as the free-text street/unit
-- detail; `suburb` is the fixed dropdown value used to match bookings in
-- the same area on the same day so a cleaner can complete more than one
-- job without excess travel between them.
ALTER TABLE bookings ADD COLUMN suburb TEXT;
CREATE INDEX IF NOT EXISTS idx_bookings_suburb_date ON bookings(suburb, booking_date);
