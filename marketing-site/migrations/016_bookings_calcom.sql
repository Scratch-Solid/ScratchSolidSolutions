-- 016_bookings_calcom.sql
-- Link marketing bookings to the Cal.com booking that drives the
-- Cal.com -> n8n -> internal-portal job-ingestion pipeline.
--
-- When a client books on the marketing site, the server creates a matching
-- Cal.com booking (see src/lib/calcom.ts). Cal.com then fires BOOKING_CREATED
-- to n8n, which calls the portal webhook to create the job + checklist and
-- auto-assign a cleaner. We persist the Cal.com UID here so the two systems
-- can be reconciled and so we never double-submit the same booking.

-- Cal.com booking UID returned by the Cal.com v2 API (null until/if created).
ALTER TABLE bookings ADD COLUMN calcom_uid TEXT DEFAULT NULL;

-- Lifecycle of the Cal.com hand-off, independent of the local booking status:
--   'not_sent'   - Cal.com integration disabled/unconfigured, nothing sent
--   'pending'    - attempting to create the Cal.com booking
--   'created'    - Cal.com booking created successfully (UID stored)
--   'failed'     - Cal.com booking creation failed (see logs); needs retry
ALTER TABLE bookings ADD COLUMN calcom_status TEXT DEFAULT 'not_sent';

CREATE INDEX IF NOT EXISTS idx_bookings_calcom_uid ON bookings(calcom_uid);
CREATE INDEX IF NOT EXISTS idx_bookings_calcom_status ON bookings(calcom_status);
