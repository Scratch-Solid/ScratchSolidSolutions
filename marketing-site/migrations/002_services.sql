-- Marketing Database Services Tables
-- Migration for scratchsolid-marketing-db (production)

-- Services table
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  detailed_description TEXT DEFAULT '',
  base_price REAL DEFAULT 0,
  room_multiplier REAL DEFAULT 1.0,
  is_active INTEGER DEFAULT 1,
  icon TEXT DEFAULT '',
  display_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Service categories table
CREATE TABLE IF NOT EXISTS service_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Service pricing table
CREATE TABLE IF NOT EXISTS service_pricing (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_id INTEGER NOT NULL,
  min_quantity INTEGER DEFAULT 1,
  max_quantity INTEGER DEFAULT NULL,
  price REAL NOT NULL,
  unit TEXT DEFAULT 'service',
  client_type TEXT DEFAULT 'all', -- 'individual', 'business', 'all'
  special_price REAL DEFAULT NULL,
  special_label TEXT DEFAULT '',
  special_valid_from TEXT DEFAULT NULL,
  special_valid_until TEXT DEFAULT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

-- Service areas table
CREATE TABLE IF NOT EXISTS service_areas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  coverage_area TEXT, -- JSON or polygon data
  base_price_modifier REAL DEFAULT 1.0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_services_is_active ON services(is_active);
CREATE INDEX IF NOT EXISTS idx_services_display_order ON services(display_order);
CREATE INDEX IF NOT EXISTS idx_service_pricing_service_id ON service_pricing(service_id);
CREATE INDEX IF NOT EXISTS idx_service_pricing_client_type ON service_pricing(client_type);
CREATE INDEX IF NOT EXISTS idx_service_categories_is_active ON service_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_service_areas_is_active ON service_areas(is_active);
