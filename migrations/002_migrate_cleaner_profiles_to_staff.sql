-- Phase 2: Data Migration
-- This migration migrates data from cleaner_profiles to staff table and backfills new columns

-- Migrate data from cleaner_profiles to staff
INSERT INTO staff (username, first_name, last_name, cellphone, tax_number, bio, phone, address, emergency_contact1, emergency_contact2, is_active, created_at, updated_at)
SELECT 
    username,
    first_name,
    last_name,
    cellphone,
    tax_number,
    bio,
    phone,
    address,
    emergency_contact1,
    emergency_contact2,
    is_active,
    created_at,
    updated_at
FROM cleaner_profiles
ON CONFLICT(username) DO NOTHING;

-- Migrate existing bookings to booking_assignments
INSERT INTO booking_assignments (booking_id, staff_id, pool_type, service_type, time_slot, assignment_date, status, assigned_at, reason)
SELECT 
    b.id as booking_id,
    b.assigned_staff_id as staff_id,
    CASE 
        WHEN b.service_type IN ('OFFICE', 'COMMERCIAL') THEN 'BUSINESS'
        ELSE 'INDIVIDUAL'
    END as pool_type,
    b.service_type,
    b.time_slot,
    DATE(b.booking_date) as assignment_date,
    CASE 
        WHEN b.status = 'completed' THEN 'completed'
        WHEN b.status = 'cancelled' THEN 'cancelled'
        WHEN b.assigned_staff_id IS NOT NULL THEN 'assigned'
        ELSE 'pending'
    END as status,
    b.assigned_at,
    'Migrated from legacy booking system' as reason
FROM bookings b
WHERE b.assigned_staff_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Backfill new columns in bookings table
UPDATE bookings 
SET service_type = 'RESIDENTIAL'
WHERE service_type IS NULL;

UPDATE bookings 
SET assignment_status = CASE 
    WHEN status = 'completed' THEN 'completed'
    WHEN status = 'cancelled' THEN 'cancelled'
    WHEN assigned_staff_id IS NOT NULL THEN 'assigned'
    ELSE 'pending'
END
WHERE assignment_status IS NULL;

-- Create POPIA-compliant public profiles for staff
INSERT INTO staff_public_profiles (staff_id, display_name, bio, specialties, certifications, languages, years_experience, average_rating, total_reviews, is_visible, created_at, updated_at)
SELECT 
    s.id as staff_id,
    s.first_name || ' ' || s.last_name as display_name,
    s.bio,
    '["General Cleaning", "Deep Cleaning"]' as specialties,
    '[]' as certifications,
    '["English"]' as languages,
    0 as years_experience,
    0.0 as average_rating,
    0 as total_reviews,
    1 as is_visible,
    CURRENT_TIMESTAMP as created_at,
    CURRENT_TIMESTAMP as updated_at
FROM staff s
LEFT JOIN staff_public_profiles sp ON s.id = sp.staff_id
WHERE sp.staff_id IS NULL;

-- Initialize default data for pricing_config
INSERT INTO pricing_config (service_type, base_price, transport_fee, weekend_surcharge, holiday_surcharge, rush_surcharge, effective_from, updated_by)
VALUES 
    ('RESIDENTIAL', 500.00, 50.00, 0.10, 0.15, 0.20, CURRENT_TIMESTAMP, 'system'),
    ('LEKKESLAAP', 600.00, 60.00, 0.10, 0.15, 0.20, CURRENT_TIMESTAMP, 'system'),
    ('POST_CONSTRUCTION', 800.00, 80.00, 0.10, 0.15, 0.20, CURRENT_TIMESTAMP, 'system'),
    ('OFFICE', 700.00, 70.00, 0.10, 0.15, 0.20, CURRENT_TIMESTAMP, 'system'),
    ('COMMERCIAL', 900.00, 90.00, 0.10, 0.15, 0.20, CURRENT_TIMESTAMP, 'system')
ON CONFLICT(service_type) DO NOTHING;

-- Initialize default data for marketing_cms
INSERT INTO marketing_cms (content_key, content, content_type, is_active, created_at, updated_at, updated_by)
VALUES 
    ('hero_title', 'Professional Cleaning Services', 'text', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'system'),
    ('hero_subtitle', 'Experience the difference with our expert cleaning team', 'text', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'system'),
    ('about_us', 'We are a leading cleaning service provider with years of experience in delivering exceptional cleaning solutions.', 'text', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'system'),
    ('contact_email', 'info@scratchsolidsolutions.org', 'text', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'system'),
    ('contact_phone', '+27 11 123 4567', 'text', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'system')
ON CONFLICT(content_key) DO NOTHING;

-- Verification queries
-- Check staff migration
SELECT 'Staff migration count:' as info, COUNT(*) as count FROM staff;

-- Check booking assignments migration
SELECT 'Booking assignments migration count:' as info, COUNT(*) as count FROM booking_assignments;

-- Check public profiles creation
SELECT 'Public profiles creation count:' as info, COUNT(*) as count FROM staff_public_profiles;

-- Check pricing config initialization
SELECT 'Pricing config initialization count:' as info, COUNT(*) as count FROM pricing_config;

-- Check marketing CMS initialization
SELECT 'Marketing CMS initialization count:' as info, COUNT(*) as count FROM marketing_cms;

-- Record migration
INSERT INTO migrations (name, executed_at) VALUES ('002_migrate_cleaner_profiles_to_staff', CURRENT_TIMESTAMP)
ON CONFLICT(name) DO NOTHING;
