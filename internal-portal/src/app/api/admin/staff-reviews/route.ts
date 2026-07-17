import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  const auth = await withAuth(request, ['admin']);
  if (auth instanceof NextResponse) return auth;
  const { user, db } = auth;

  try {
    const body = await request.json() as any;
    const {
      staff_id, client_rating, attendance_score, company_values_score,
      punctuality_score, quality_score, communication_score, notes,
    } = body;

    if (!staff_id) {
      return NextResponse.json({ error: 'Missing staff_id' }, { status: 400 });
    }

    if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

    // Insert performance metric row
    // booking_id is TEXT PK in production — use a composite key for admin-entered reviews
    const reviewMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    const generatedBookingId = `admin_review_${staff_id}_${reviewMonth}_${Date.now()}`;

    await db.prepare(`
      INSERT INTO job_performance_metrics (
        booking_id, staff_id, client_rating, attendance_score, company_values_score,
        punctuality_score, quality_score, communication_score,
        notes, recorded_by, scheduled_time, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '00:00', CURRENT_TIMESTAMP)
    `).bind(
      generatedBookingId,
      String(staff_id),
      client_rating        ?? 4,
      attendance_score     ?? 5,
      company_values_score ?? 5,
      punctuality_score    ?? 7,
      quality_score        ?? 7,
      communication_score  ?? 7,
      notes || null,
      `admin:${user.id}`,
    ).run();

    // Upsert monthly review summary
    // staff_monthly_reviews schema is staff_id/month/year/reviewer_id
    // (migrations/011_performance_reviews.sql) - not review_month/reviewed_by/
    // reviewed_at, which don't exist and previously made every insert fail.
    const reviewYear = new Date().getFullYear();
    await db.prepare(`
      INSERT INTO staff_monthly_reviews (staff_id, month, year, attendance_score, company_values_score, notes, reviewer_id, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(staff_id, month, year) DO UPDATE SET
        attendance_score     = excluded.attendance_score,
        company_values_score = excluded.company_values_score,
        notes                = excluded.notes,
        updated_at           = CURRENT_TIMESTAMP
    `).bind(staff_id, reviewMonth, reviewYear, attendance_score ?? 5, company_values_score ?? 5, notes || null, user.id).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Staff review error:', error);
    return NextResponse.json({ error: `Failed to submit review: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
  }
}
