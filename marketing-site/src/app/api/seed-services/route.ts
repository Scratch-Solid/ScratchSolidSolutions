export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// No authentication required for seeding - this is a one-time setup endpoint
export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Check if services already exist
    const existingServices = await db.prepare('SELECT COUNT(*) as count FROM services').first();
    const count = (existingServices as any)?.count || 0;

    if (count > 0) {
      return NextResponse.json({ message: 'Services already exist', count });
    }

    // Insert default services
    await db.prepare(
      `INSERT INTO services (name, description, detailed_description, base_price, room_multiplier, is_active, icon, display_order, created_at, updated_at) VALUES
      ('Standard Clean', 'Regular cleaning service', 'Our standard cleaning service includes dusting, vacuuming, mopping, bathroom cleaning, and kitchen cleaning. Perfect for regular maintenance.', 350.00, 1.0, 1, 'Standard', 1, datetime('now'), datetime('now')),
      ('Deep Clean', 'Deep cleaning service', 'Deep cleaning service includes everything in standard clean plus detailed cleaning of all surfaces, inside cabinets, baseboards, and hard-to-reach areas.', 550.00, 1.2, 1, 'Deep', 2, datetime('now'), datetime('now')),
      ('Move In/Out', 'Move in or move out cleaning', 'Comprehensive cleaning for moving in or out. Includes all surfaces, appliances, cabinets, and ensures the property is spotless for the next occupant.', 750.00, 1.5, 1, 'Move', 3, datetime('now'), datetime('now')),
      ('Post-Construction', 'Post-construction cleaning', 'Specialized cleaning after construction or renovation. Removes dust, debris, and prepares the space for occupancy.', 1200.00, 2.0, 1, 'Construction', 4, datetime('now'), datetime('now')),
      ('Commercial', 'Commercial cleaning', 'Professional cleaning for offices, retail spaces, and commercial properties. Customized to your business needs.', 450.00, 1.3, 1, 'Commercial', 5, datetime('now'), datetime('now')),
      ('Maintenance Clean', 'Weekly or bi-weekly maintenance cleaning', 'Regular maintenance cleaning for homes and offices. Ideal for ongoing cleaning schedules.', 300.00, 1.0, 1, 'Maintenance', 6, datetime('now'), datetime('now')),
      ('Short-Term Stay', 'LekkeSlaap and short-term rental cleaning', 'Five-star guest turnovers for local rentals. Ensures your property stays "Lekke" for every guest.', 400.00, 1.1, 1, 'Stay', 7, datetime('now'), datetime('now'))`
    ).run();

    // Insert default service pricing
    await db.prepare(
      `INSERT INTO service_pricing (service_id, min_quantity, max_quantity, price, unit, client_type, created_at, updated_at) VALUES
      (1, 1, NULL, 350.00, 'service', 'individual', datetime('now'), datetime('now')),
      (1, 1, NULL, 450.00, 'service', 'business', datetime('now'), datetime('now')),
      (2, 1, NULL, 550.00, 'service', 'individual', datetime('now'), datetime('now')),
      (2, 1, NULL, 650.00, 'service', 'business', datetime('now'), datetime('now')),
      (3, 1, NULL, 750.00, 'service', 'individual', datetime('now'), datetime('now')),
      (3, 1, NULL, 850.00, 'service', 'business', datetime('now'), datetime('now')),
      (4, 1, NULL, 1200.00, 'service', 'individual', datetime('now'), datetime('now')),
      (4, 1, NULL, 1400.00, 'service', 'business', datetime('now'), datetime('now')),
      (5, 1, NULL, 450.00, 'service', 'business', datetime('now'), datetime('now')),
      (6, 1, NULL, 300.00, 'service', 'individual', datetime('now'), datetime('now')),
      (6, 1, NULL, 400.00, 'service', 'business', datetime('now'), datetime('now')),
      (7, 1, NULL, 400.00, 'service', 'individual', datetime('now'), datetime('now')),
      (7, 1, NULL, 500.00, 'service', 'business', datetime('now'), datetime('now'))`
    ).run();

    return NextResponse.json({ success: true, message: 'Services seeded successfully', services_count: 7, pricing_count: 13 });
  } catch (error) {
    console.error('Error seeding services:', error);
    return NextResponse.json({ error: 'Failed to seed services' }, { status: 500 });
  }
}
