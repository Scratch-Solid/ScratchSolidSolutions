-- MIGRATION: Full schema for users, bookings, contracts, cleaners, payroll, admin_actions, notifications, content_pages

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role VARCHAR(20) CHECK (role IN ('individual','business','cleaner','admin')),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  business_name VARCHAR(150),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted BOOLEAN DEFAULT 0,
  soft_deleted_at TIMESTAMP
);

-- BOOKINGS
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  cleaner_id INTEGER REFERENCES users(id),
  booking_type VARCHAR(20) CHECK (booking_type IN ('once_off','recurring','contract')),
  cleaning_type VARCHAR(50),
  payment_method VARCHAR(10) CHECK (payment_method IN ('cash','eft')),
  loyalty_discount_applied BOOLEAN DEFAULT 0,
  status VARCHAR(20) CHECK (status IN ('pending','confirmed','completed','cancelled')),
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CONTRACTS
CREATE TABLE IF NOT EXISTS contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  contract_type VARCHAR(10) CHECK (contract_type IN ('1_year','5_year')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  rate NUMERIC(10,2) NOT NULL,
  weekend_multiplier NUMERIC(4,2) DEFAULT 1.5,
  immutable BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CLEANERS
CREATE TABLE IF NOT EXISTS cleaners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) CHECK (status IN ('idle','on_the_way','arrived','completed')),
  profile_picture TEXT,
  blocked BOOLEAN DEFAULT 0,
  gps_lat DECIMAL(9,6),
  gps_long DECIMAL(9,6),
  current_earnings NUMERIC(10,2) DEFAULT 0
);

-- PAYROLL
CREATE TABLE IF NOT EXISTS payroll (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cleaner_id INTEGER REFERENCES cleaners(id) ON DELETE CASCADE,
  cycle_start DATE,
  cycle_end DATE,
  base_rate NUMERIC(10,2),
  weekend_rate NUMERIC(10,2),
  deductions NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ADMIN ACTIONS
CREATE TABLE IF NOT EXISTS admin_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER REFERENCES users(id),
  action_type VARCHAR(50),
  target_id INTEGER,
  target_table VARCHAR(50),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  details TEXT
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  channel VARCHAR(20) CHECK (channel IN ('whatsapp','email')),
  message TEXT,
  status VARCHAR(20) CHECK (status IN ('pending','sent','failed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CONTENT PAGES
CREATE TABLE IF NOT EXISTS content_pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug VARCHAR(50) UNIQUE,
  title VARCHAR(100),
  body TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
