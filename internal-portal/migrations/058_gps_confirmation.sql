-- Geocoded coordinates for the exact booking address, so GPS geofence
-- checks compare against the real property instead of a suburb centroid.
ALTER TABLE bookings ADD COLUMN geocoded_lat REAL;
ALTER TABLE bookings ADD COLUMN geocoded_long REAL;
ALTER TABLE bookings ADD COLUMN geocoded_at TEXT;

-- Dual-source tracking for the Transparency Policy timeline. arrived_at/
-- completed_at (added in 057) remain the canonical, client-facing values -
-- whichever source reports first. These columns record each source
-- independently so admin can see both and compare them, and so GPS can
-- backfill the canonical value if WhatsApp never arrives.
ALTER TABLE jobs ADD COLUMN arrived_at_whatsapp TEXT;
ALTER TABLE jobs ADD COLUMN arrived_at_gps TEXT;
ALTER TABLE jobs ADD COLUMN completed_at_whatsapp TEXT;
ALTER TABLE jobs ADD COLUMN completed_at_gps TEXT;
