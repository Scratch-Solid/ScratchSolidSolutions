-- Migration: Restore emojis to services table
-- This migration restores the original emojis for better visual appearance

UPDATE services SET icon = '🧹' WHERE icon = 'S' OR icon = 'Standard';
UPDATE services SET icon = '✨' WHERE icon = 'D' OR icon = 'Deep';
UPDATE services SET icon = '📦' WHERE icon = 'M' OR icon = 'Move';
UPDATE services SET icon = '🔨' WHERE icon = 'C' OR icon = 'Construction';
UPDATE services SET icon = '🏢' WHERE icon = 'B' OR icon = 'Commercial';
UPDATE services SET icon = '🧹' WHERE icon = 'T' AND name = 'Maintenance Clean';
UPDATE services SET icon = '🏠' WHERE icon = 'L' OR icon = 'Stay';

-- Verify changes
SELECT '=== ICONS RESTORED TO EMOJIS ===' as status;
SELECT id, name, icon FROM services ORDER BY display_order;
