-- 004_cancellation_refund.sql
-- Add cancellation tracking to bookings and refund fields to payments (backend DB)

ALTER TABLE bookings ADD COLUMN cancellation_reason TEXT DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN cancelled_at TEXT DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN rescheduled_from TEXT DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN cancelled_by TEXT DEFAULT NULL;

ALTER TABLE payments ADD COLUMN refunded_amount REAL DEFAULT 0;
ALTER TABLE payments ADD COLUMN refund_reference TEXT DEFAULT NULL;
ALTER TABLE payments ADD COLUMN refund_reason TEXT DEFAULT NULL;
ALTER TABLE payments ADD COLUMN refunded_at TEXT DEFAULT NULL;
