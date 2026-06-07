-- 014_contracts_templates.sql
-- Contracts and templates tables already exist in production
-- (created by original schema.sql bootstrap with different column sets)

-- Tables already exist; skip CREATE TABLE
-- CREATE TABLE IF NOT EXISTS templates (...);
-- CREATE TABLE IF NOT EXISTS contracts (...);

-- Only create indexes for columns that actually exist in the current schema
CREATE INDEX IF NOT EXISTS idx_templates_name ON templates(name);
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON templates(created_by);
CREATE INDEX IF NOT EXISTS idx_contracts_business_id ON contracts(business_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
-- template_id and start_date do not exist in current contracts schema
-- CREATE INDEX IF NOT EXISTS idx_contracts_template_id ON contracts(template_id);
-- CREATE INDEX IF NOT EXISTS idx_contracts_start_date ON contracts(start_date);
