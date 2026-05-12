-- Migration: add missing columns to ai_responses for existing D1 databases
-- category and updated_at were added to schema.sql but need ALTER for pre-existing tables
ALTER TABLE ai_responses ADD COLUMN category TEXT DEFAULT '';
ALTER TABLE ai_responses ADD COLUMN updated_at TEXT DEFAULT (datetime('now'));
