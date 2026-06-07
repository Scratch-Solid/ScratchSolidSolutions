-- 016_payments_fix.sql
-- Fix payments table to match code usage and add admin_id to audit_logs
-- Code in src/index.js inserts: method, confirmed, zoho_invoice_id
-- Code in queue-consumer.ts inserts: admin_id (but migration 010 uses user_id)

-- All columns already present in payments and audit_logs tables
-- ALTER TABLE payments ADD COLUMN method TEXT DEFAULT 'cash';
-- ALTER TABLE payments ADD COLUMN confirmed INTEGER DEFAULT 0;
-- ALTER TABLE payments ADD COLUMN zoho_invoice_id TEXT DEFAULT NULL;
-- ALTER TABLE payments ADD COLUMN user_id INTEGER REFERENCES users(id);
-- ALTER TABLE audit_logs ADD COLUMN admin_id INTEGER REFERENCES users(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(method);
CREATE INDEX IF NOT EXISTS idx_payments_confirmed ON payments(confirmed);
CREATE INDEX IF NOT EXISTS idx_payments_zoho_invoice_id ON payments(zoho_invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);
