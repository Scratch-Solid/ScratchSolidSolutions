-- Import Data into scratchsolid-backend-db
-- Run: npx wrangler d1 execute scratchsolid-backend-db --remote --file=./scripts/import-backend-data.sql

-- This script imports backend-specific data into the new isolated backend database
-- Run the migrations first: npx wrangler d1 migrations apply scratchsolid-backend-db --remote

-- Note: This is a template. Actual INSERT statements need to be generated
-- from the exported data using the export-current-data.sql script.

-- Import users (system, api, admin roles)
-- INSERT INTO users (email, password_hash, role, name, api_key_hash, created_at, updated_at)
-- SELECT email, password_hash, role, name, api_key_hash, created_at, updated_at
-- FROM scratchsolid_db_users
-- WHERE role IN ('system', 'api', 'admin');

-- Import sessions
-- Import booking_services
-- Import booking_status_history
-- Import payments
-- Import payment_methods
-- Import invoices
-- Import invoice_items
-- Import transactions
-- Import stripe_customers
-- Import stripe_events
-- Import webhook_events
-- Import api_keys
-- Import api_rate_limits
-- Import integration_logs
-- Import system_config
-- Import feature_flags
