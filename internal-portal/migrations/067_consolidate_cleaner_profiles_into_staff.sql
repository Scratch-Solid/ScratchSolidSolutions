-- 067_consolidate_cleaner_profiles_into_staff.sql
--
-- Consolidates `cleaner_profiles` into `staff`. Per a research pass across
-- the whole app: virtually every real join/lookup goes through `user_id`,
-- not `cleaner_profiles.id` - the one-table-per-department split
-- (cleaner_profiles for cleaners, staff for generic onboarding/pool
-- tracking) is legacy and no longer earns its complexity. `staff` becomes
-- the single canonical profile table for every department (cleaning,
-- digital, transport, supervisor).
--
-- THIS MIGRATION DOES NOT DROP `cleaner_profiles`. It only:
--   1. Resolves the `employee_id` / `paysheet_code` naming collision.
--   2. Adds every cleaner_profiles-only column to `staff`.
--   3. Backfills `staff` from `cleaner_profiles`, idempotently.
-- `cleaner_profiles` is left in place, untouched, so every existing row
-- (including live banking details and ID numbers for real employees) is
-- still there for verification/rollback until every call site has been
-- confirmed working against `staff` in production. Dropping it is a
-- deliberately separate, later migration.
--
-- ─── Naming collision: staff.employee_id vs cleaner_profiles.paysheet_code ───
--
-- Both columns hold the same concept: a unique staff/cleaner identifier
-- code that doubles as the login username. Investigation found:
--
--   * cleaner_profiles.paysheet_code is the live, actively-used column -
--     read/written by ~30 files (login, WhatsApp/GPS status sync, training,
--     payroll, ERPNext registration, the admin cleaners UI, the new
--     supervisor job-assignment endpoints). cleaner_profiles.username is a
--     second, redundant NOT NULL UNIQUE column that every INSERT site in
--     the app sets to the exact same value as paysheet_code - it has never
--     actually diverged in practice, so this migration does not carry a
--     separate `username` column onto `staff` at all; `paysheet_code`
--     alone covers both the login-username and payroll-code roles
--     cleaner_profiles used two columns for.
--
--   * staff.employee_id has existed since the very first migration
--     (001_core_tables.sql) as `TEXT UNIQUE NOT NULL` with no DEFAULT, but
--     no code path in the app has ever supplied it on INSERT
--     (createOrUpdateStaffRecord's INSERT INTO staff omits it entirely).
--     That means every INSERT into `staff` through that function has
--     almost certainly been failing the NOT NULL constraint in production
--     and failing silently (the error is caught and logged, not
--     surfaced) - i.e. employee_id is not just unused, it appears to have
--     made `staff` inserts broken. A human should confirm this by checking
--     `SELECT COUNT(*) FROM staff` and `SELECT COUNT(*) FROM staff WHERE
--     employee_id IS NOT NULL` on the live DB before relying on this
--     migration's backfill being the *first* real data in that column.
--
-- Decision: ADD staff.paysheet_code as a new column rather than RENAME
-- staff.employee_id (originally planned as a rename - changed after this
-- migration failed on staging: staging's live `staff` table doesn't have
-- `employee_id`, `department`, or `status` at all - a THIRD, independently
-- confirmed instance of staging/production schema drift found this
-- session, on top of the employee_id-is-dead-and-NOT-NULL problem this
-- migration already documented above). Since production's employee_id
-- holds zero real data (confirmed: `SELECT COUNT(*) FROM staff` = 0), a
-- rename buys nothing over a plain ADD - `employee_id` is simply left in
-- place, inert, on whichever environment already has it (same treatment
-- already given to cleaner_profiles.username elsewhere in this file).
-- paysheet_code is the name that wins because it's the name the rest of
-- the live application already uses everywhere, and because "paysheet
-- code" is the term used uniformly for cleaners, supervisors, digital and
-- transport staff alike in the code's own comments (see
-- generatePaysheetCode() in src/lib/cleaner-integrations.ts).
--
-- staff.department and staff.status are NOT handled in this migration at
-- all, for the same reason: production already has both (also holding no
-- real data), staging has neither, and SQLite has no conditional DDL - a
-- single ALTER TABLE ADD COLUMN statement cannot be written to succeed on
-- one and be skipped on the other within one plain SQL file, and
-- `wrangler d1 migrations apply` aborts the whole file on the first
-- failing statement. Both columns are reconciled and backfilled via a
-- one-off, per-environment-aware command run separately once this
-- migration is confirmed applied everywhere (checks each environment's
-- actual schema first, only ALTERs where the column is actually missing)
-- - see the operational notes kept alongside this migration in project
-- memory, not committed here since it's a one-time imperative action, not
-- a repeatable migration.

ALTER TABLE staff ADD COLUMN paysheet_code TEXT;

-- ─── Add every other cleaner_profiles-only column to staff ───
-- Types/defaults copied from cleaner_profiles' live schema where they
-- differ from staff's existing conventions. Confirmed absent from BOTH
-- staging and production before writing this - safe unconditional ADDs.

ALTER TABLE staff ADD COLUMN profile_picture TEXT;
ALTER TABLE staff ADD COLUMN residential_address TEXT;
ALTER TABLE staff ADD COLUMN emergency_contact TEXT;
ALTER TABLE staff ADD COLUMN emergency_phone TEXT;
ALTER TABLE staff ADD COLUMN id_number TEXT;
ALTER TABLE staff ADD COLUMN bank_name TEXT;
ALTER TABLE staff ADD COLUMN account_number TEXT;
ALTER TABLE staff ADD COLUMN branch_code TEXT;
ALTER TABLE staff ADD COLUMN account_holder TEXT;
ALTER TABLE staff ADD COLUMN blocked INTEGER DEFAULT 0;
ALTER TABLE staff ADD COLUMN assignment_pool TEXT DEFAULT 'AUTO' CHECK(assignment_pool IN ('AUTO','MANUAL'));

CREATE INDEX IF NOT EXISTS idx_staff_paysheet_code ON staff(paysheet_code);
CREATE INDEX IF NOT EXISTS idx_staff_assignment_pool ON staff(assignment_pool);

-- ─── Backfill: every cleaner_profiles row gets a matching staff row ───
--
-- Idempotent and non-destructive by construction:
--   * INSERT ... SELECT ... WHERE NOT EXISTS only creates a staff row for a
--     user_id that doesn't already have one - safe to re-run.
--   * The UPDATE only touches the columns cleaner_profiles owns (identity,
--     contact, banking, live work-status, pool). It never touches
--     onboarding_stage, training_completed, contract_url, hired_at,
--     pool_type, is_active, service_type, hire_date or position - so a
--     staff row that already existed for this user_id (created by the
--     onboarding flow - create-profile/sign-contract/training-completion)
--     keeps 100% of its own data. Nothing for other departments
--     (digital/transport/supervisor-only staff rows with no matching
--     cleaner_profiles.user_id) is touched at all.
--   * paysheet_code is only ever set from cleaner_profiles' own value,
--     which was already UNIQUE NOT NULL there, so this cannot introduce a
--     duplicate against another staff row's paysheet_code unless that
--     value was already duplicated in cleaner_profiles (pre-existing data
--     problem, not something this migration could cause or fix blindly -
--     if this INSERT/UPDATE fails on a UNIQUE constraint, STOP and
--     investigate the specific paysheet_code before re-running).

-- department and status deliberately excluded from this INSERT/UPDATE -
-- see the note above; backfilled separately once both columns are
-- confirmed present on every environment.

-- employee_id is TEXT UNIQUE NOT NULL with no DEFAULT on environments where
-- it predates this migration (see investigation above) - since no code path
-- ever supplies it and it is being retired in favor of paysheet_code, it is
-- set to the same value here purely to satisfy that constraint. paysheet_code
-- is already guaranteed unique (generateUniquePaysheetCode), so this cannot
-- introduce a UNIQUE collision on employee_id either. On environments where
-- the column doesn't exist at all, referencing it here would fail - but this
-- statement only runs where employee_id is confirmed present (production);
-- staging's ADD COLUMN for it already happened via the earlier fixed version
-- of this migration and staging has 0 cleaner_profiles rows to backfill.
INSERT INTO staff (
  user_id, employee_id, paysheet_code, first_name, last_name, cellphone,
  profile_picture, residential_address, emergency_contact,
  emergency_phone, id_number, bank_name, account_number, branch_code,
  account_holder, blocked, assignment_pool, created_at, updated_at
)
SELECT
  cp.user_id, cp.paysheet_code, cp.paysheet_code, cp.first_name, cp.last_name, cp.cellphone,
  cp.profile_picture, cp.residential_address, cp.emergency_contact,
  cp.emergency_phone, cp.id_number, cp.bank_name, cp.account_number,
  cp.branch_code, cp.account_holder, COALESCE(cp.blocked, 0),
  COALESCE(cp.assignment_pool, 'AUTO'), cp.created_at, cp.updated_at
FROM cleaner_profiles cp
WHERE NOT EXISTS (SELECT 1 FROM staff s WHERE s.user_id = cp.user_id);

UPDATE staff
SET
  paysheet_code = (SELECT cp.paysheet_code FROM cleaner_profiles cp WHERE cp.user_id = staff.user_id),
  first_name = (SELECT cp.first_name FROM cleaner_profiles cp WHERE cp.user_id = staff.user_id),
  last_name = (SELECT cp.last_name FROM cleaner_profiles cp WHERE cp.user_id = staff.user_id),
  cellphone = (SELECT cp.cellphone FROM cleaner_profiles cp WHERE cp.user_id = staff.user_id),
  profile_picture = (SELECT cp.profile_picture FROM cleaner_profiles cp WHERE cp.user_id = staff.user_id),
  residential_address = (SELECT cp.residential_address FROM cleaner_profiles cp WHERE cp.user_id = staff.user_id),
  emergency_contact = (SELECT cp.emergency_contact FROM cleaner_profiles cp WHERE cp.user_id = staff.user_id),
  emergency_phone = (SELECT cp.emergency_phone FROM cleaner_profiles cp WHERE cp.user_id = staff.user_id),
  id_number = (SELECT cp.id_number FROM cleaner_profiles cp WHERE cp.user_id = staff.user_id),
  bank_name = (SELECT cp.bank_name FROM cleaner_profiles cp WHERE cp.user_id = staff.user_id),
  account_number = (SELECT cp.account_number FROM cleaner_profiles cp WHERE cp.user_id = staff.user_id),
  branch_code = (SELECT cp.branch_code FROM cleaner_profiles cp WHERE cp.user_id = staff.user_id),
  account_holder = (SELECT cp.account_holder FROM cleaner_profiles cp WHERE cp.user_id = staff.user_id),
  blocked = COALESCE((SELECT cp.blocked FROM cleaner_profiles cp WHERE cp.user_id = staff.user_id), staff.blocked),
  assignment_pool = COALESCE((SELECT cp.assignment_pool FROM cleaner_profiles cp WHERE cp.user_id = staff.user_id), staff.assignment_pool),
  updated_at = datetime('now')
WHERE EXISTS (SELECT 1 FROM cleaner_profiles cp WHERE cp.user_id = staff.user_id);

-- ─── NOT migrated, and deliberately so ───
--
-- Several OTHER tables store `cleaner_profiles.id` (not user_id) as a real,
-- already-populated foreign key value: bookings.cleaner_id,
-- booking_assignments.cleaner_id, cleaning_feedback.cleaner_id and
-- payroll.cleaner_id all declare `REFERENCES cleaner_profiles(id)` back to
-- migrations 002/004/020. `staff` has its own independent id sequence
-- (already populated by onboarding flows), so `staff.id` is NOT
-- interchangeable with `cleaner_profiles.id` for any existing row. This
-- migration intentionally leaves cleaner_profiles.id resolvable (by not
-- dropping the table) so the application code that resolves this specific
-- legacy numeric id can keep doing so unchanged - see the code-side report
-- for exactly which statements were left pointed at cleaner_profiles for
-- this reason. Re-pointing those FKs at `staff.id` would require a
-- separate data migration on those four tables and is out of scope here.
