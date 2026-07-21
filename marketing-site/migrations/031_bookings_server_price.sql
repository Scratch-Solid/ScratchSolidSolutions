-- 031_bookings_server_price.sql
--
-- POST /api/bookings and POST /api/payments/paystack/initialize both took a
-- `price`/`amount` field straight from the client request body and used it
-- unmodified - the promo-discount cap in bookings, and the actual amount
-- charged via Paystack. Nothing anywhere recomputed the price server-side
-- from the real service/pricing/area data, so a client that simply edited
-- the request body before sending it could set the real charge to any
-- amount, including near-zero, while still getting a real cleaning booked.
--
-- These three columns let the booking-creation route store what it
-- independently computed server-side (same calculateQuote() logic the
-- client uses for its live preview, but run again here against fresh
-- services/service_pricing/service_areas rows, never the client's own
-- numbers), so the payment route can charge that stored value instead of
-- trusting the request body.
ALTER TABLE bookings ADD COLUMN service_id INTEGER;
ALTER TABLE bookings ADD COLUMN quantity INTEGER;
ALTER TABLE bookings ADD COLUMN quoted_price REAL;
