-- Create admin users for Jason Tshaka and Arnica Nqayi
-- These are admin credentials requested by user

-- Jason Tshaka Admin
INSERT INTO users (email, password_hash, role, name, phone, address, business_name, created_at, updated_at) 
VALUES (
  'it@scratchsolidsolutions.org', 
  '$2b$12$ErYNtC8YdBKSHPhgMCciYegJBkZeR1A4j8doZMOix2CyIWWiwn4F', 
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
  '$2b$12$RgbeP0ncPqx.wQU5wDhvVOqCPkVbP7uTDbvJLcZxSmHFQEehPsaUa', 
  'admin', 
  'Arnica Nqayi', 
  '0746998097', 
  '', 
  'Scratch Solid Solutions', 
  datetime('now'), 
  datetime('now')
);
