-- 028_staff_pool_transitions_column_fix.sql
-- Fix staff_pool_transitions column name mismatch
-- Migration 022_staff_pool.sql uses approved_by and transition_date
-- Code in pool-transition/route.ts uses transitioned_by and transitioned_at
-- Add alias columns for backward compatibility

-- Add columns that code uses but migration 022 doesn't have
ALTER TABLE staff_pool_transitions ADD COLUMN transitioned_by INTEGER REFERENCES users(id);
ALTER TABLE staff_pool_transitions ADD COLUMN transitioned_at TEXT DEFAULT CURRENT_TIMESTAMP;

-- Backfill transitioned_by from approved_by for existing rows
UPDATE staff_pool_transitions SET transitioned_by = approved_by WHERE transitioned_by IS NULL;
-- Backfill transitioned_at from transition_date for existing rows
UPDATE staff_pool_transitions SET transitioned_at = transition_date WHERE transitioned_at IS NULL AND transition_date IS NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_pool_transitions_transitioned_by ON staff_pool_transitions(transitioned_by);
CREATE INDEX IF NOT EXISTS idx_staff_pool_transitions_transitioned_at ON staff_pool_transitions(transitioned_at);
