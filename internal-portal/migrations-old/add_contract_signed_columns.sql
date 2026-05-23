-- Add contract signing columns to cleaner_profiles table
ALTER TABLE cleaner_profiles ADD COLUMN contract_signed INTEGER DEFAULT 0;
ALTER TABLE cleaner_profiles ADD COLUMN contract_signed_date TEXT DEFAULT NULL;
