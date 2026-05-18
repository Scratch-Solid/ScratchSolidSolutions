-- Migration to fix About Us table schemas to match API expectations
-- Run with: npx wrangler d1 execute scratchsolid-db --remote --file=migrations/fix_about_us_schema.sql

-- Fix about_us_content: add missing columns (title, display_order, active)
ALTER TABLE about_us_content ADD COLUMN title TEXT DEFAULT '';
ALTER TABLE about_us_content ADD COLUMN display_order INTEGER DEFAULT 0;
ALTER TABLE about_us_content ADD COLUMN active INTEGER DEFAULT 1;

-- Fix leaders: add 'active' column alias (migration used 'is_active' but API uses 'active')
ALTER TABLE leaders ADD COLUMN active INTEGER DEFAULT 1;

-- Sync existing is_active values into new active column
UPDATE leaders SET active = is_active;
