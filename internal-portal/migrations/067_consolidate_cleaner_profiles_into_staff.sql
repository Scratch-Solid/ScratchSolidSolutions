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
-- Decision: RENAME staff.employee_id -> staff.paysheet_code (keeping its
-- existing NOT NULL UNIQUE constraint, which matches cleaner_profiles'
-- own NOT NULL requirement on paysheet_code). paysheet_code is the name
-- that wins because it's the name the rest of the live application already
-- uses everywhere outside this one dead column, and because "paysheet
-- code" is the term used uniformly for cleaners, supervisors, digital and
-- transport staff alike in the code's own comments
-- (see generatePaysheetCode() in src/lib/cleaner-integrations.ts) - it was
-- never actually cleaner-specific despite the old table name. `employee_id`
-- was the generic placeholder name and is not otherwise referenced by any
-- live query in the app (only training_progress.employee_id and
-- new_joiners.erpnext_employee_id use that name, and those are unrelated,
-- out-of-scope ERPNext-facing string keys per the task brief).

ALTER TABLE staff RENAME COLUMN employee_id TO paysheet_code;

-- ─── Add every cleaner_profiles-only column to staff ───
-- Types/defaults copied from cleaner_profiles' live schema where they
-- differ from staff's existing conventions.

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

-- NOTE on staff.status vs cleaner_profiles.status: staff already has a
-- `status TEXT DEFAULT 'active'` column from 001_core_tables.sql. Nothing
-- in the live app currently reads or writes it (dead, same as employee_id
-- was) - so this migration reuses it for cleaner_profiles.status'
-- semantics (idle/on_way/arrived/completed/blocked live work-status,
-- synced by the WhatsApp/GPS confirmation flow) rather than adding a
-- second `status`-shaped column. This is a second, smaller naming
-- collision beyond the one the task called out explicitly - flagged here
-- for the same reason. Existing staff rows keep whatever value they have
-- (almost certainly the untouched 'active' default, since nothing writes
-- this column today); new cleaner rows get their real status backfilled
-- below.

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

INSERT INTO staff (
  user_id, paysheet_code, first_name, last_name, cellphone, department,
  status, profile_picture, residential_address, emergency_contact,
  emergency_phone, id_number, bank_name, account_number, branch_code,
  account_holder, blocked, assignment_pool, created_at, updated_at
)
SELECT
  cp.user_id, cp.paysheet_code, cp.first_name, cp.last_name, cp.cellphone,
  COALESCE(cp.department, 'cleaning'), COALESCE(cp.status, 'idle'),
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
  department = COALESCE((SELECT cp.department FROM cleaner_profiles cp WHERE cp.user_id = staff.user_id), staff.department, 'cleaning'),
  status = COALESCE((SELECT cp.status FROM cleaner_profiles cp WHERE cp.user_id = staff.user_id), staff.status),
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
