-- Service Pricing Update Script
-- This script allows you to update service pricing permanently
-- Run this using: npx wrangler d1 execute scratchsolid_db --local --file=sql/update_service_pricing.sql
-- For production: npx wrangler d1 execute scratchsolid_db --remote --file=sql/update_service_pricing.sql

-- =================================================================
-- SERVICE PRICING CONFIGURATION
-- Edit the values below to update your service pricing
-- =================================================================

-- Standard Clean Pricing
UPDATE service_pricing 
SET price = 350.00, 
    unit_price = 100.00,
    min_quantity = 1,
    max_quantity = NULL
WHERE service_id = 1 AND client_type = 'individual';

UPDATE service_pricing 
SET price = 450.00, 
    unit_price = 100.00,
    min_quantity = 1,
    max_quantity = NULL
WHERE service_id = 1 AND client_type = 'business';

-- Deep Clean Pricing
UPDATE service_pricing 
SET price = 550.00, 
    unit_price = 150.00,
    min_quantity = 1,
    max_quantity = NULL
WHERE service_id = 2 AND client_type = 'individual';

UPDATE service_pricing 
SET price = 650.00, 
    unit_price = 150.00,
    min_quantity = 1,
    max_quantity = NULL
WHERE service_id = 2 AND client_type = 'business';

-- Move In/Out Pricing
UPDATE service_pricing 
SET price = 750.00, 
    unit_price = 200.00,
    min_quantity = 1,
    max_quantity = NULL
WHERE service_id = 3 AND client_type = 'individual';

UPDATE service_pricing 
SET price = 850.00, 
    unit_price = 200.00,
    min_quantity = 1,
    max_quantity = NULL
WHERE service_id = 3 AND client_type = 'business';

-- Post-Construction Pricing
UPDATE service_pricing 
SET price = 1200.00, 
    unit_price = 50.00,
    min_quantity = 50,
    max_quantity = 2000
WHERE service_id = 4 AND client_type = 'individual';

UPDATE service_pricing 
SET price = 1400.00, 
    unit_price = 50.00,
    min_quantity = 50,
    max_quantity = 2000
WHERE service_id = 4 AND client_type = 'business';

-- Commercial Cleaning Pricing
UPDATE service_pricing 
SET price = 450.00, 
    unit_price = 20.00,
    min_quantity = 50,
    max_quantity = 2000
WHERE service_id = 5 AND client_type = 'business';

-- =================================================================
-- VERIFICATION QUERIES
-- These queries show the updated pricing for verification
-- =================================================================

SELECT '=== UPDATED PRICING SUMMARY ===' as info;

SELECT 
  s.name as service_name,
  sp.client_type,
  sp.price as base_price,
  sp.unit_price,
  sp.min_quantity,
  sp.max_quantity,
  sp.unit,
  CASE 
    WHEN sp.unit_price > 0 THEN 
      'Formula: ' || sp.price || ' + ((quantity - 1) x ' || sp.unit_price || ')'
    ELSE 
      'Formula: ' || sp.price || ' (flat rate)'
  END as pricing_formula
FROM service_pricing sp
JOIN services s ON sp.service_id = s.id
ORDER BY sp.service_id, sp.client_type;

SELECT '=== PRICING UPDATE COMPLETED ===' as status;
