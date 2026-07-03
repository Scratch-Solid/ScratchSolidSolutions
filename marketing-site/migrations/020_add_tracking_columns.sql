-- Add GPS tracking columns to bookings table
ALTER TABLE bookings ADD COLUMN gps_lat REAL;
ALTER TABLE bookings ADD COLUMN gps_long REAL;
ALTER TABLE bookings ADD COLUMN last_location_update TEXT;
