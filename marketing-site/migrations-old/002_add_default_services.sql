-- Migration: Add default services, pricing, and promo codes
-- This migration populates the newly created tables with initial data

-- Insert default services
INSERT OR IGNORE INTO services (name, description, detailed_description, base_price, room_multiplier, is_active, icon, display_order) VALUES
('Standard Clean', 'Regular cleaning service', 'Our standard cleaning service includes dusting, vacuuming, mopping, bathroom cleaning, and kitchen cleaning. Perfect for regular maintenance.', 350.00, 1.0, 1, '🧹', 1),
('Deep Clean', 'Deep cleaning service', 'Deep cleaning service includes everything in standard clean plus detailed cleaning of all surfaces, inside cabinets, baseboards, and hard-to-reach areas.', 550.00, 1.2, 1, '✨', 2),
('Move In/Out', 'Move in or move out cleaning', 'Comprehensive cleaning for moving in or out. Includes all surfaces, appliances, cabinets, and ensures the property is spotless for the next occupant.', 750.00, 1.5, 1, '📦', 3),
('Post-Construction', 'Post-construction cleaning', 'Specialized cleaning after construction or renovation. Removes dust, debris, and prepares the space for occupancy.', 1200.00, 2.0, 1, '🔨', 4),
('Commercial', 'Commercial cleaning', 'Professional cleaning for offices, retail spaces, and commercial properties. Customized to your business needs.', 450.00, 1.3, 1, '🏢', 5);

-- Insert default service pricing
INSERT OR IGNORE INTO service_pricing (service_id, min_quantity, max_quantity, price, unit, client_type) VALUES
(1, 1, NULL, 350.00, 'service', 'individual'),
(1, 1, NULL, 450.00, 'service', 'business'),
(2, 1, NULL, 550.00, 'service', 'individual'),
(2, 1, NULL, 650.00, 'service', 'business'),
(3, 1, NULL, 750.00, 'service', 'individual'),
(3, 1, NULL, 850.00, 'service', 'business'),
(4, 1, NULL, 1200.00, 'service', 'individual'),
(4, 1, NULL, 1400.00, 'service', 'business'),
(5, 1, NULL, 450.00, 'service', 'business');

-- Insert sample promo codes
INSERT OR IGNORE INTO promo_codes (code, description, discount_type, discount_value, valid_from, valid_until, created_by) VALUES
('WELCOME10', 'Welcome discount for new customers', 'percentage', 10.0, datetime('now'), datetime('now', '+30 days'), 1),
('SUMMER20', 'Summer special promotion', 'percentage', 20.0, datetime('now'), datetime('now', '+60 days'), 1),
('FLAT50', 'Fixed amount discount', 'fixed', 50.0, datetime('now'), datetime('now', '+90 days'), 1);
