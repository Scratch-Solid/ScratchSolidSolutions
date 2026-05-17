-- Create test client user for staging login testing
-- Phone: 0736417176 (matching Jason's phone for testing)
-- Password: test123 (bcrypt hash)
INSERT INTO users (email, password_hash, role, name, phone, email_verified) VALUES
  ('test@staging.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'client', 'Test Client', '0736417176', 1);
