-- 030_weekend_requests.sql
--
-- Creates weekend_requests, referenced by src/app/api/weekend-requests/*
-- and src/lib/db.ts (createWeekendRequest/getWeekendRequestsByBusiness/
-- updateWeekendRequestStatus) since those were written, but this table was
-- never actually created - every call has been throwing "no such table:
-- weekend_requests". Distinct from weekend_assignments (migration 027),
-- which is the admin-side recurring schedule tied to a contract's
-- weekend_required flag; this table is a business-initiated, one-off
-- request for weekend service on a specific date, with its own
-- pending -> approved/rejected/cancelled lifecycle.

CREATE TABLE IF NOT EXISTS weekend_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL,
  requested_date TEXT NOT NULL,
  special_instructions TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'cancelled')),
  assigned_cleaner_id INTEGER,
  assigned_cleaner_name TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (business_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_weekend_requests_business_id ON weekend_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_weekend_requests_status ON weekend_requests(status);
