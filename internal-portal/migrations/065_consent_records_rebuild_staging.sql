-- consent_records on staging still has consent_version TEXT NOT NULL (no
-- default) left over from an older design the current code no longer
-- writes to, blocking every insert. Confirmed zero rows exist. Renaming
-- (not dropping) the old table and creating a fresh one matching
-- production's actual shape exactly, so nothing is destroyed and the two
-- environments finally match.
ALTER TABLE consent_records RENAME TO consent_records_legacy_unused;

CREATE TABLE consent_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  consent_type TEXT NOT NULL,
  consent_given INTEGER DEFAULT 0,
  consent_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
