import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const [clientsResult, jobsResult, ratingResult, cleanersResult, reviewsResult] = await Promise.all([
      db.prepare(`SELECT COUNT(DISTINCT client_id) as count FROM bookings WHERE status = 'completed'`).first<{ count: number }>(),
      db.prepare(`SELECT COUNT(*) as count FROM bookings WHERE status = 'completed'`).first<{ count: number }>(),
      db.prepare(`SELECT ROUND(AVG(rating), 1) as average FROM reviews WHERE status = 'approved'`).first<{ average: number | null }>(),
      db.prepare(`SELECT COUNT(*) as count FROM employees WHERE status = 'active'`).first<{ count: number }>(),
      db.prepare(`SELECT COUNT(*) as count FROM reviews WHERE status = 'approved'`).first<{ count: number }>(),
    ]);

    return NextResponse.json({
      clients_serviced: clientsResult?.count ?? 0,
      jobs_completed: jobsResult?.count ?? 0,
      average_rating: ratingResult?.average ?? 0,
      active_cleaners: cleanersResult?.count ?? 0,
      reviews_count: reviewsResult?.count ?? 0,
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 });
  }
}
