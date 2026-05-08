INSERT INTO users (email, password_hash, role, name, phone, business_name, created_at, updated_at) 
VALUES (
  'it@scratchsolidsolutions.org', 
  '$2b$12$LQv3c1yqBQVHkFdZv9kE2O3P4yY8W5v6lKq0', 
  'admin', 
  'Jason Tshaka', 
  '0736417176', 
  'Scratch Solid Solutions', 
  datetime('now'), 
  datetime('now')
);
