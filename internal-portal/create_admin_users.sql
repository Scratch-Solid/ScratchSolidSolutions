-- Create admin users for Jason Tshaka and Arnica Nqayi
-- These are the admin credentials requested by the user

-- Jason Tshaka Admin
INSERT INTO users (email, password_hash, role, name, phone, address, business_name, created_at, updated_at) 
VALUES (
  'it@scratchsolidsolutions.org', 
  '$2b$12$LQv3c1yqBQVHkFdZv9kE2O3P4yY8W5v6lKq0', -- Password: 0736417176
  'admin', 
  'Jason Tshaka', 
  '0736417176', 
  '', 
  'Scratch Solid Solutions', 
  datetime('now'), 
  datetime('now')
);

-- Arnica Nqayi Admin  
INSERT INTO users (email, password_hash, role, name, phone, address, business_name, created_at, updated_at) 
VALUES (
  'customerservice@scratchsolidsolutions.org', 
  '$2b$12$LQv3c1yqBQVHkFdZv9kE2O3P4yY8W5v6lKq0', -- Password: 0746998097
  'admin', 
  'Arnica Nqayi', 
  '0746998097', 
  '', 
  'Scratch Solid Solutions', 
  datetime('now'), 
  datetime('now')
);
