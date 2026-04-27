-- Migration to add About Us page tables
-- Run this with: npx wrangler d1 execute scratchsolid-db --remote --file=migrations/add_about_us_tables.sql

-- Leaders table (for About Us page leadership team)
CREATE TABLE IF NOT EXISTS leaders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  display_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- About us content table (for dynamic About Us page content)
CREATE TABLE IF NOT EXISTS about_us_content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section TEXT UNIQUE NOT NULL, -- 'about-main', 'mission', 'vision', 'values'
  content TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leaders_display_order ON leaders(display_order);
CREATE INDEX IF NOT EXISTS idx_leaders_is_active ON leaders(is_active);
CREATE INDEX IF NOT EXISTS idx_about_us_content_section ON about_us_content(section);
