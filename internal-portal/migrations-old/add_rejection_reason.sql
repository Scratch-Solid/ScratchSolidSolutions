-- Add rejection_reason column to pending_contracts table
ALTER TABLE pending_contracts ADD COLUMN rejection_reason TEXT DEFAULT NULL;
