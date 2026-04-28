import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return authResult;
  const { db } = authResult;

  try {
    const bookingId = params.id;

    // Get booking details
    const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').bind(bookingId).first();
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Get available cleaners (not blocked, idle or on_way)
    const cleaners = await db.prepare(
      `SELECT cp.*, u.email, u.name 
       FROM cleaner_profiles cp
       JOIN users u ON cp.user_id = u.id
       WHERE cp.blocked = 0 AND cp.status IN ('idle', 'on_way')`
    ).all();

    const availableCleaners = cleaners.results || [];

    // Get current workload for each cleaner (bookings assigned but not completed)
    const cleanerWorkloads: any = {};
    for (const cleaner of availableCleaners) {
      const workload = await db.prepare(
        `SELECT COUNT(*) as count FROM bookings 
         WHERE cleaner_id = ? AND status IN ('assigned', 'on_way', 'arrived')`
      ).bind((cleaner as any).user_id).first();
      cleanerWorkloads[(cleaner as any).user_id] = (workload as any)?.count || 0;
    }

    // Calculate distance if GPS coordinates available (simplified Haversine formula)
    const bookingLat = (booking as any).gps_lat || null;
    const bookingLng = (booking as any).gps_long || null;

    const scoredCleaners = (availableCleaners as any[]).map((cleaner: any) => {
      let distanceScore = 0;
      let workloadScore = cleanerWorkloads[cleaner.user_id] * 10; // Penalty per active booking

      if (bookingLat && bookingLng && cleaner.gps_lat && cleaner.gps_long) {
        const distance = calculateDistance(
          bookingLat, bookingLng,
          cleaner.gps_lat, cleaner.gps_long
        );
        distanceScore = distance; // Lower is better
      }

      return {
        ...cleaner,
        current_workload: cleanerWorkloads[cleaner.user_id],
        distance_km: distanceScore,
        score: workloadScore + distanceScore
      };
    });

    // Sort by score (lowest first)
    scoredCleaners.sort((a, b) => a.score - b.score);

    return NextResponse.json(scoredCleaners.slice(0, 5)); // Return top 5 suggestions
  } catch (error) {
    console.error('Error suggesting cleaners:', error);
    return NextResponse.json({ error: 'Failed to suggest cleaners' }, { status: 500 });
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
