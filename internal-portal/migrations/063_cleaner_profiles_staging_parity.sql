-- Staging's cleaner_profiles table is missing columns production has had
-- for a while (username, emergency_contact, emergency_phone, id_number,
-- bank details, etc.) - found live while walking through the cleaner
-- onboarding flow end-to-end. Both environments had zero rows in this
-- table, so no backfill/uniqueness concerns; added without NOT NULL/UNIQUE
-- constraints here since D1/SQLite can't add those to an existing table
-- without a backfill value, and this is enough for column parity.
ALTER TABLE cleaner_profiles ADD COLUMN username TEXT;
ALTER TABLE cleaner_profiles ADD COLUMN profile_picture TEXT;
ALTER TABLE cleaner_profiles ADD COLUMN residential_address TEXT;
ALTER TABLE cleaner_profiles ADD COLUMN emergency_contact TEXT;
ALTER TABLE cleaner_profiles ADD COLUMN emergency_phone TEXT;
ALTER TABLE cleaner_profiles ADD COLUMN department TEXT DEFAULT 'cleaning';
ALTER TABLE cleaner_profiles ADD COLUMN id_number TEXT;
ALTER TABLE cleaner_profiles ADD COLUMN bank_name TEXT;
ALTER TABLE cleaner_profiles ADD COLUMN account_number TEXT;
ALTER TABLE cleaner_profiles ADD COLUMN branch_code TEXT;
ALTER TABLE cleaner_profiles ADD COLUMN account_holder TEXT;
