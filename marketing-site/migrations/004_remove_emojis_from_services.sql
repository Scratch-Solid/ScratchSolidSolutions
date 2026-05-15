-- Migration: Remove emojis from services table
-- This migration replaces emoji icons with text descriptions for professional appearance

UPDATE services SET icon = 'Standard' WHERE icon = '🧹';
UPDATE services SET icon = 'Deep' WHERE icon = '✨';
UPDATE services SET icon = 'Move' WHERE icon = '📦';
UPDATE services SET icon = 'Construction' WHERE icon = '🔨';
UPDATE services SET icon = 'Commercial' WHERE icon = '🏢';

-- Verify changes
SELECT '=== EMOJIS REMOVED FROM SERVICES TABLE ===' as status;
SELECT id, name, icon FROM services ORDER BY display_order;
