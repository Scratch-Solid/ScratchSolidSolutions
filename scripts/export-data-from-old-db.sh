#!/bin/bash

# Data Export Script for D1
# This script exports data from the old scratchsolid-db using wrangler

# Create export directory
mkdir -p ./scripts/export

# Export shared tables (users, sessions, bookings) - these go to all three databases
echo "Exporting users table..."
npx wrangler d1 execute scratchsolid-db --remote --command="SELECT * FROM users" > ./scripts/export/users.json

echo "Exporting sessions table..."
npx wrangler d1 execute scratchsolid-db --remote --command="SELECT * FROM sessions" > ./scripts/export/sessions.json

echo "Exporting bookings table..."
npx wrangler d1 execute scratchsolid-db --remote --command="SELECT * FROM bookings" > ./scripts/export/bookings.json

# Export portal-specific tables
echo "Exporting portal-specific tables..."
npx wrangler d1 execute scratchsolid-db --remote --command="SELECT * FROM cleaner_profiles" > ./scripts/export/cleaner_profiles.json
npx wrangler d1 execute scratchsolid-db --remote --command="SELECT * FROM staff" > ./scripts/export/staff.json
npx wrangler d1 execute scratchsolid-db --remote --command="SELECT * FROM booking_assignments" > ./scripts/export/booking_assignments.json

# Add more portal tables as needed...

# Export marketing-specific tables
echo "Exporting marketing-specific tables..."
npx wrangler d1 execute scratchsolid-db --remote --command="SELECT * FROM services" > ./scripts/export/services.json
npx wrangler d1 execute scratchsolid-db --remote --command="SELECT * FROM promo_codes" > ./scripts/export/promo_codes.json

# Add more marketing tables as needed...

# Export backend-specific tables
echo "Exporting backend-specific tables..."
npx wrangler d1 execute scratchsolid-db --remote --command="SELECT * FROM payments" > ./scripts/export/payments.json
npx wrangler d1 execute scratchsolid-db --remote --command="SELECT * FROM invoices" > ./scripts/export/invoices.json

# Add more backend tables as needed...

echo "Export complete. Data saved to ./scripts/export/"
