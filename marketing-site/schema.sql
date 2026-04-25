-- D1 Database Schema for Scratch Solid Solutions
-- Run with: wrangler d1 execute scratchsolid-db --file=schema.sql

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client',
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  business_name TEXT,
  business_registration TEXT,
  failed_attempts INTEGER DEFAULT 0,
  locked_until TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  otp TEXT,
  expires_at TEXT NOT NULL,
  method TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Cleaner profiles table
CREATE TABLE IF NOT EXISTS cleaner_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  paysheet_code TEXT,
  first_name TEXT,
  last_name TEXT,
  department TEXT DEFAULT 'cleaning',
  profile_picture TEXT,
  residential_address TEXT,
  cellphone TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Pending contracts table
CREATE TABLE IF NOT EXISTS pending_contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  client_name TEXT NOT NULL,
  business_name TEXT,
  contract_details TEXT,
  status TEXT DEFAULT 'pending',
  submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  employee_code TEXT UNIQUE NOT NULL,
  department TEXT,
  position TEXT,
  hire_date TEXT,
  salary REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  client_name TEXT NOT NULL,
  location TEXT NOT NULL,
  service_type TEXT NOT NULL,
  booking_date TEXT NOT NULL,
  booking_time TEXT NOT NULL,
  special_instructions TEXT,
  booking_type TEXT DEFAULT 'standard',
  cleaning_type TEXT DEFAULT 'standard',
  payment_method TEXT DEFAULT 'cash',
  loyalty_discount REAL DEFAULT 0,
  cleaner_id INTEGER,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (cleaner_id) REFERENCES cleaner_profiles(id) ON DELETE SET NULL
);

-- Task completions table (for cleaner earnings)
CREATE TABLE IF NOT EXISTS task_completions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  cleaner_id INTEGER NOT NULL,
  earnings REAL DEFAULT 150,
  completed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (cleaner_id) REFERENCES cleaner_profiles(id) ON DELETE CASCADE
);

-- Content table (for marketing site content)
CREATE TABLE IF NOT EXISTS content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  collection TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(collection, slug)
);

-- AI responses table
CREATE TABLE IF NOT EXISTS ai_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_cleaner_profiles_username ON cleaner_profiles(username);
CREATE INDEX IF NOT EXISTS idx_cleaner_profiles_user_id ON cleaner_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_cleaner_id ON bookings(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_content_collection_slug ON content(collection, slug);
