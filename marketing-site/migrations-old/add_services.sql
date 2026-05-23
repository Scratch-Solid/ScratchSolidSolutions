-- Migration: Add services and service_pricing tables for quote system

-- Services table
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  icon TEXT DEFAULT '',
  display_order INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
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
  unit TEXT DEFAULT 'task',
  client_type TEXT DEFAULT 'all',
  special_price REAL DEFAULT NULL,
  special_label TEXT DEFAULT '',
  special_valid_from TEXT DEFAULT NULL,
  special_valid_until TEXT DEFAULT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (service_id) REFERENCES services(id)
);

-- Insert sample services
INSERT INTO services (name, description, icon, display_order, active) VALUES
('Residential Cleaning', 'Professional residential cleaning services for homes and apartments', '🏠', 1, 1),
('Commercial Cleaning', 'Comprehensive cleaning solutions for offices and business premises', '🏢', 2, 1),
('Deep Cleaning', 'Thorough deep cleaning service for a spotless environment', '✨', 3, 1),
('Move In/Out Cleaning', 'Specialized cleaning for moving in or out of properties', '📦', 4, 1),
('Carpet Cleaning', 'Professional carpet cleaning and stain removal', '🧹', 5, 1),
('Window Cleaning', 'Crystal clear window cleaning inside and out', '🪟', 6, 1);

-- Insert sample pricing
INSERT INTO service_pricing (service_id, min_quantity, max_quantity, price, unit, client_type) VALUES
(1, 1, NULL, 350.00, 'task', 'individual'),
(1, 1, NULL, 450.00, 'task', 'business'),
(2, 1, NULL, 500.00, 'task', 'business'),
(3, 1, NULL, 600.00, 'task', 'individual'),
(3, 1, NULL, 750.00, 'task', 'business'),
(4, 1, NULL, 550.00, 'task', 'individual'),
(4, 1, NULL, 700.00, 'task', 'business'),
(5, 1, NULL, 200.00, 'room', 'individual'),
(5, 1, NULL, 250.00, 'room', 'business'),
(6, 1, NULL, 150.00, 'window', 'individual'),
(6, 1, NULL, 200.00, 'window', 'business');
