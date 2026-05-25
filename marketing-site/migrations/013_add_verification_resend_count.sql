-- 013_add_verification_resend_count.sql
-- Add verification_resend_count column to users table for limiting resend attempts

ALTER TABLE users ADD COLUMN verification_resend_count INTEGER DEFAULT 0;
