-- Auto/Manual cleaner assignment pools + annual KPI/bonus summary
-- See docs/kpi-bonus-system.md for the full formula and rationale.

-- AUTO pool: cleaners eligible for automatic assignment to standard/maintenance
-- jobs a single cleaner can complete in the booking window.
-- MANUAL pool: cleaners the admin assigns by hand to bigger jobs (deep clean,
-- post-construction, commercial, move-in/move-out) that often need 2+ people.
ALTER TABLE cleaner_profiles ADD COLUMN assignment_pool TEXT DEFAULT 'AUTO' CHECK(assignment_pool IN ('AUTO','MANUAL'));
CREATE INDEX IF NOT EXISTS idx_cleaner_profiles_assignment_pool ON cleaner_profiles(assignment_pool);

-- One row per cleaner per calendar year: the actual source of truth for the
-- annual bonus/increase decision, computed by averaging that year's monthly
-- staff_monthly_reviews.overall_score values.
CREATE TABLE IF NOT EXISTS kpi_annual_summary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cleaner_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  months_reviewed INTEGER NOT NULL DEFAULT 0,
  avg_monthly_kpi REAL NOT NULL DEFAULT 0,
  client_component REAL NOT NULL DEFAULT 0,
  system_component REAL NOT NULL DEFAULT 0,
  admin_component REAL NOT NULL DEFAULT 0,
  kpi_score_5pt REAL NOT NULL DEFAULT 0,
  bonus_percentage INTEGER NOT NULL DEFAULT 0,
  increase_percentage INTEGER NOT NULL DEFAULT 0,
  calculated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  synced_to_erpnext_at TEXT DEFAULT NULL,
  FOREIGN KEY (cleaner_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(cleaner_id, year)
);

CREATE INDEX IF NOT EXISTS idx_kpi_annual_summary_cleaner ON kpi_annual_summary(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_kpi_annual_summary_year ON kpi_annual_summary(year);

-- Distinguishes a lead cleaner from support cleaners on a multi-cleaner
-- MANUAL-pool job. Default 'primary' keeps existing single-cleaner bookings
-- behaving exactly as before.
ALTER TABLE booking_assignments ADD COLUMN role TEXT DEFAULT 'primary';

-- Whether a service needs the MANUAL pool (2+ cleaners assigned by hand)
-- rather than AUTO (single cleaner, system-assigned). Real service data
-- shows `services.category` doesn't cleanly separate these - e.g. "Deep
-- Clean" is filed under the "standard" category alongside "Standard Clean" -
-- so this needs its own explicit flag rather than being inferred from
-- category. Seeded from the current real catalog per the admin's spec.
ALTER TABLE services ADD COLUMN requires_manual_pool INTEGER DEFAULT 0;
UPDATE services SET requires_manual_pool = 1 WHERE name IN ('Deep Clean', 'Office Clean', 'Move-in/Move-out');
