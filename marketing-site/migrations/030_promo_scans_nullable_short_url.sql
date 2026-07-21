-- promo_scans.short_url_id has been NOT NULL since its original migration
-- (003_promotions.sql), written back when this table only tracked scans of
-- short URLs. Migration 021 bolted on promo_code_id/promo_code/scan_timestamp
-- to reuse this table for generic promo-code page-view tracking via
-- api/analytics/track, and migration 028 added referrer - but nobody relaxed
-- the original NOT NULL constraint, so every insert from that route (which
-- has no short_url_id to supply - it isn't tracking a short-URL visit) still
-- violates it: "NOT NULL constraint failed: promo_scans.short_url_id".
--
-- SQLite/D1 can't drop a NOT NULL constraint via a plain ALTER TABLE, so this
-- recreates the table with short_url_id nullable and copies existing rows
-- across untouched.
CREATE TABLE promo_scans_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  short_url_id INTEGER,
  scanned_at TEXT DEFAULT (datetime('now')),
  ip_address TEXT,
  user_agent TEXT,
  promo_code_id INTEGER DEFAULT NULL,
  promo_code TEXT DEFAULT NULL,
  scan_timestamp TEXT DEFAULT NULL,
  referrer TEXT,
  FOREIGN KEY (short_url_id) REFERENCES short_urls(id) ON DELETE CASCADE
);

INSERT INTO promo_scans_new (id, short_url_id, scanned_at, ip_address, user_agent, promo_code_id, promo_code, scan_timestamp, referrer)
SELECT id, short_url_id, scanned_at, ip_address, user_agent, promo_code_id, promo_code, scan_timestamp, referrer FROM promo_scans;

DROP TABLE promo_scans;
ALTER TABLE promo_scans_new RENAME TO promo_scans;

CREATE INDEX IF NOT EXISTS idx_promo_scans_short_url_id ON promo_scans(short_url_id);
CREATE INDEX IF NOT EXISTS idx_promo_scans_promo_code_id ON promo_scans(promo_code_id);
