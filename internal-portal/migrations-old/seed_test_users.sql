-- Seed test users for development/testing
-- This creates admin and cleaner users for testing purposes

-- Admin user
-- Email: admin@scratchsolid.co.za
-- Password: Admin@123
INSERT INTO users (email, password_hash, role, name, phone, created_at, updated_at)
VALUES (
  'admin@scratchsolid.co.za',
  '$2b$10$DxX6JJuRclVCUZlpPpYePOFRBjQz6CmPFNJJB/PT1GSKpfFDYecQ.',
  'admin',
  'System Admin',
  '+27123456789',
  datetime('now'),
  datetime('now')
);

-- Cleaner user
-- Paysheet Code: SCRATCH001
-- Phone: +27821234567
-- Password: Cleaner@123
INSERT INTO users (email, password_hash, role, name, phone, created_at, updated_at)
VALUES (
  'cleaner@scratchsolid.co.za',
  '$2b$10$T/Q7hbdxFI.g/68ALuSRB.lfStzQDAm9wYQgo2ZW7PzUrRG0its3q',
  'cleaner',
  'Test Cleaner',
  '+27821234567',
  datetime('now'),
  datetime('now')
);

-- Get the cleaner user ID
-- Note: SQLite doesn't support variables the same way, so we'll use a subquery
INSERT INTO cleaner_profiles (user_id, username, paysheet_code, department, status, created_at, updated_at)
SELECT 
  id,
  'SCRATCH001',
  'SCRATCH001',
  'cleaning',
  'idle',
  datetime('now'),
  datetime('now')
FROM users WHERE email = 'cleaner@scratchsolid.co.za';

-- Digital user
-- Paysheet Code: SOLID001
-- Phone: +27823456789
-- Password: Digital@123
INSERT INTO users (email, password_hash, role, name, phone, created_at, updated_at)
VALUES (
  'digital@scratchsolid.co.za',
  '$2b$10$aN7T8QDKBZyohZtEUthAnuCrUVseT0qhfimkWS3mQOBQ1LJ8ULPJq',
  'digital',
  'Test Digital',
  '+27823456789',
  datetime('now'),
  datetime('now')
);

-- Create digital profile
INSERT INTO cleaner_profiles (user_id, username, paysheet_code, department, status, created_at, updated_at)
SELECT 
  id,
  'SOLID001',
  'SOLID001',
  'digital',
  'idle',
  datetime('now'),
  datetime('now')
FROM users WHERE email = 'digital@scratchsolid.co.za';

-- Transport user
-- Paysheet Code: TRANS001
-- Phone: +27825678901
-- Password: Transport@123
INSERT INTO users (email, password_hash, role, name, phone, created_at, updated_at)
VALUES (
  'transport@scratchsolid.co.za',
  '$2b$10$GwTvMabbsGO1YOMu0DPca..w8YYrQubS//p8e8JglXvy.fMJHKDu2',
  'transport',
  'Test Transport',
  '+27825678901',
  datetime('now'),
  datetime('now')
);

-- Create transport profile
INSERT INTO cleaner_profiles (user_id, username, paysheet_code, department, status, created_at, updated_at)
SELECT 
  id,
  'TRANS001',
  'TRANS001',
  'transport',
  'idle',
  datetime('now'),
  datetime('now')
FROM users WHERE email = 'transport@scratchsolid.co.za';
