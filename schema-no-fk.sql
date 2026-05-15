-- Shared Cloudflare D1 Schema for Scratch Solid Solutions
-- Used by both marketing-site and internal-portal
-- Version without foreign key constraints for initial setup

-- Users (unified user table for all roles)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client',
  name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  business_name TEXT DEFAULT '',
  business_registration TEXT DEFAULT '',
  business_info TEXT DEFAULT '',
  failed_attempts INTEGER DEFAULT 0,
  locked_until TEXT DEFAULT NULL,
  soft_delete_at TEXT DEFAULT NULL,
  deleted INTEGER DEFAULT 0,
  email_verified INTEGER DEFAULT 1,
  email_verification_token TEXT,
  email_verification_expires TEXT,
  email_verification_sent_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Roles and permissions for RBAC
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_id INTEGER,
  permission_id INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(role_id, permission_id)
);

-- Content Pages (for marketing site - privacy, terms, contact, etc.)
CREATE TABLE IF NOT EXISTS content_pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  last_updated TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Content table (used by /api/content for static site content: contact, privacy, terms, services, about, etc.)
CREATE TABLE IF NOT EXISTS content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  collection TEXT NOT NULL DEFAULT 'pages',
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  text TEXT NOT NULL DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_content_slug ON content(slug);
CREATE INDEX IF NOT EXISTS idx_content_collection ON content(collection);

-- About Us Content (structured sections for the about page)
CREATE TABLE IF NOT EXISTS about_us_content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL DEFAULT '',
  display_order INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_about_us_content_section ON about_us_content(section);

-- Background Images (for marketing site)
CREATE TABLE IF NOT EXISTS background_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  name TEXT NOT NULL,
  is_active INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Cleaner profiles (extended profile for cleaners)
CREATE TABLE IF NOT EXISTS cleaner_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  username TEXT UNIQUE NOT NULL,
  paysheet_code TEXT,
  first_name TEXT DEFAULT '',
  last_name TEXT DEFAULT '',
  residential_address TEXT DEFAULT '',
  cellphone TEXT DEFAULT '',
  tax_number TEXT DEFAULT '',
  profile_picture TEXT DEFAULT '',
  emergency_contact1_name TEXT DEFAULT '',
  emergency_contact1_phone TEXT DEFAULT '',
  emergency_contact2_name TEXT DEFAULT '',
  emergency_contact2_phone TEXT DEFAULT '',
  department TEXT DEFAULT 'cleaning',
  specialties TEXT DEFAULT '[]',
  rating REAL DEFAULT 0,
  status TEXT DEFAULT 'idle',
  blocked INTEGER DEFAULT 0,
  gps_lat REAL DEFAULT NULL,
  gps_long REAL DEFAULT NULL,
  weekday_rate REAL DEFAULT 150,
  weekend_rate REAL DEFAULT 225,
  deductions REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER,
  client_name TEXT DEFAULT '',
  cleaner_id INTEGER,
  location TEXT DEFAULT '',
  service_type TEXT DEFAULT '',
  booking_date TEXT DEFAULT '',
  booking_time TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  special_instructions TEXT DEFAULT '',
  booking_type TEXT DEFAULT 'standard',
  cleaning_type TEXT DEFAULT 'standard',
  payment_method TEXT DEFAULT 'cash',
  loyalty_discount REAL DEFAULT 0,
  start_time TEXT DEFAULT '',
  end_time TEXT DEFAULT '',
  pop_status TEXT DEFAULT 'not_uploaded',
  pop_reference TEXT DEFAULT '',
  pop_upload_url TEXT DEFAULT '',
  pop_verified_at TEXT DEFAULT NULL,
  pop_verified_by INTEGER,
  zoho_invoice_id TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Weekend requests (business premium service)
CREATE TABLE IF NOT EXISTS weekend_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER,
  requested_date TEXT NOT NULL,
  special_instructions TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  assigned_cleaner_id INTEGER,
  assigned_cleaner_name TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Pending contracts (new joiner workflow)
CREATE TABLE IF NOT EXISTS pending_contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  id_passport_number TEXT DEFAULT '',
  contact_number TEXT DEFAULT '',
  position_applied_for TEXT DEFAULT '',
  department TEXT DEFAULT '',
  generated_username TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  applicant_signature TEXT DEFAULT '',
  witness_representative TEXT DEFAULT '',
  consent_data TEXT DEFAULT '{}',
  submitted_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Employees (approved joiners)
CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pending_contract_id INTEGER,
  full_name TEXT NOT NULL,
  id_passport_number TEXT DEFAULT '',
  contact_number TEXT DEFAULT '',
  position_applied_for TEXT DEFAULT '',
  department TEXT DEFAULT '',
  username TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  applicant_signature TEXT DEFAULT '',
  witness_representative TEXT DEFAULT '',
  consent_date TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Contracts (business service agreements)
CREATE TABLE IF NOT EXISTS contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER,
  business_name TEXT NOT NULL,
  contract_type TEXT DEFAULT 'standard',
  rate_per_hour REAL NOT NULL DEFAULT 0,
  weekend_rate_multiplier REAL DEFAULT 1.5,
  start_date TEXT NOT NULL,
  end_date TEXT DEFAULT NULL,
  status TEXT DEFAULT 'active',
  is_immutable INTEGER DEFAULT 0,
  terms TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Task completions (for cleaner earnings)
CREATE TABLE IF NOT EXISTS task_completions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER,
  cleaner_id INTEGER,
  completed_at TEXT DEFAULT (datetime('now')),
  earnings REAL DEFAULT 150,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Sessions (for auth token validation)
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  token TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT DEFAULT (datetime('now', '+7 days'))
);

-- Password reset tokens (for forgot password flow)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  token TEXT UNIQUE NOT NULL,
  otp TEXT DEFAULT NULL,
  method TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Audit logs (for tracking admin actions)
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id INTEGER,
  details TEXT DEFAULT '{}',
  ip_address TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Insert default admin user (password: admin123 - bcrypt hash)
INSERT OR IGNORE INTO users (email, password_hash, role, name) VALUES
  ('admin@scratchsolid.com', '$2b$10$uwCmscm1QfaMDW4/vYVIP.YpT6dS/meNGQFp3GQrz5qclrRuhd1R2', 'admin', 'Admin User');

-- Insert default staff users (password: staff123 - bcrypt hash)
INSERT OR IGNORE INTO users (email, password_hash, role, name) VALUES
  ('scratch@scratchsolid.com', '$2b$10$SJ.Ijy08q38mrDKlEq67vOFl7eckgJ6GmeUUNddbb9jTGhjgaR7GK', 'cleaner', 'Scratch Cleaner'),
  ('solid@scratchsolid.com', '$2b$10$SJ.Ijy08q38mrDKlEq67vOFl7eckgJ6GmeUUNddbb9jTGhjgaR7GK', 'digital', 'Solid Digital'),
  ('trans@scratchsolid.com', '$2b$10$SJ.Ijy08q38mrDKlEq67vOFl7eckgJ6GmeUUNddbb9jTGhjgaR7GK', 'transport', 'Trans Transport');

-- Performance indexes for production workloads
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_deleted ON users(deleted);
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_cleaner_id ON bookings(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_date_status ON bookings(booking_date, status);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_cleaner_profiles_user_id ON cleaner_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_cleaner_profiles_username ON cleaner_profiles(username);
CREATE INDEX IF NOT EXISTS idx_cleaner_profiles_status ON cleaner_profiles(status);
CREATE INDEX IF NOT EXISTS idx_cleaner_profiles_blocked ON cleaner_profiles(blocked);
CREATE INDEX IF NOT EXISTS idx_contracts_business_id ON contracts(business_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_task_completions_cleaner_id ON task_completions(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_booking_id ON task_completions(booking_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_weekend_requests_business_id ON weekend_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_weekend_requests_status ON weekend_requests(status);
CREATE INDEX IF NOT EXISTS idx_pending_contracts_status ON pending_contracts(status);
CREATE INDEX IF NOT EXISTS idx_employees_username ON employees(username);

-- Migration tracking for D1 native migrations
CREATE TABLE IF NOT EXISTS schema_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  applied_at TEXT DEFAULT (datetime('now'))
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  booking_id INTEGER,
  amount REAL NOT NULL,
  method TEXT DEFAULT 'cash',
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Business events table
CREATE TABLE IF NOT EXISTS business_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER,
  event_type TEXT DEFAULT '',
  requested_date TEXT DEFAULT '',
  special_instructions TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  type TEXT DEFAULT '',
  title TEXT DEFAULT '',
  message TEXT DEFAULT '',
  read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Pricing table
CREATE TABLE IF NOT EXISTS pricing (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_type TEXT NOT NULL,
  rate REAL NOT NULL,
  duration TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Templates table
CREATE TABLE IF NOT EXISTS templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  content TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

-- AI responses (for chatbot)
CREATE TABLE IF NOT EXISTS ai_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  response TEXT NOT NULL,
  category TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Leaders table (for leadership team display)
CREATE TABLE IF NOT EXISTS leaders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  booking_id INTEGER,
  rating INTEGER NOT NULL DEFAULT 5,
  text TEXT NOT NULL,
  images TEXT DEFAULT '[]',
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Additional indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_business_events_business_id ON business_events(business_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);

-- Admin Failure Logs Table
CREATE TABLE IF NOT EXISTS admin_failure_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  error_message TEXT NOT NULL,
  error_code TEXT,
  request_details TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_admin_failure_logs_admin_id ON admin_failure_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_failure_logs_created_at ON admin_failure_logs(created_at);
