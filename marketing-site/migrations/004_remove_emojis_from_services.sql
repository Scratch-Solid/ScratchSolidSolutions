-- Migration: Remove emojis from services table
-- This migration replaces emoji icons with single-letter abbreviations for professional appearance

UPDATE services SET icon = 'S' WHERE icon = '🧹' OR icon = 'Standard';
UPDATE services SET icon = 'D' WHERE icon = '✨' OR icon = 'Deep';
UPDATE services SET icon = 'M' WHERE icon = '📦' OR icon = 'Move';
UPDATE services SET icon = 'C' WHERE icon = '🔨' OR icon = 'Construction';
UPDATE services SET icon = 'B' WHERE icon = '🏢' OR icon = 'Commercial';
UPDATE services SET icon = 'T' WHERE icon = '🧹' AND name = 'Maintenance Clean';
UPDATE services SET icon = 'L' WHERE icon = '�' OR icon = 'Stay';

-- Verify changes
SELECT '=== ICONS UPDATED TO SINGLE LETTERS ===' as status;
SELECT id, name, icon FROM services ORDER BY display_order;
