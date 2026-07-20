export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { log } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['cleaner', 'staff']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;
  const userId = authResult.user?.id;

  try {
    // Get cleaner profile
    const cleanerProfile = await db.prepare(
      'SELECT s.paysheet_code, s.first_name, s.last_name, s.status FROM staff s WHERE s.user_id = ?'
    ).bind(userId).first();

    if (!cleanerProfile) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Cleaner profile not found',
          suggestion: 'Please contact support'
        }
      }, { status: 404 });
      return withSecurityHeaders(response, traceId);
    }

    const cleaner = cleanerProfile as any;

    // Get training progress
    const trainingProgress = await db.prepare(
      'SELECT completion_percentage, completed FROM training_progress WHERE employee_id = ?'
    ).bind(cleaner.paysheet_code).first();

    // Get upcoming shifts count. booking_assignments.cleaner_id is a real
    // FK to cleaner_profiles.id (migration 002), NOT to staff.id or
    // user_id - resolved via a small, NOT-MIGRATED cleaner_profiles lookup
    // (see migrations/067_consolidate_cleaner_profiles_into_staff.sql for
    // why this specific id can't move to staff.id without corrupting
    // existing booking_assignments rows).
    const legacyProfile = await db.prepare(
      'SELECT id FROM cleaner_profiles WHERE user_id = ?'
    ).bind(userId).first() as { id: number } | null;

    const upcomingShifts = legacyProfile
      ? await db.prepare(
          `SELECT COUNT(*) as count FROM booking_assignments ba
           JOIN bookings b ON ba.booking_id = b.id
           WHERE ba.cleaner_id = ? AND b.booking_date >= date('now') AND b.status != 'cancelled'`
        ).bind(legacyProfile.id).first()
      : { count: 0 };

    // Get average rating. job_performance_metrics.staff_id is a real FK to
    // users(id) (migration 011), not cleaner_profiles.id - this previously
    // bound cleaner_profiles.id here, which never matched (a pre-existing
    // bug, fixed here to use userId, consistent with @/lib/kpi.ts and
    // cleaner/ratings/route.ts which already use userId correctly).
    const ratingResult = await db.prepare(
      'SELECT AVG(client_star_rating) as avg_rating FROM job_performance_metrics WHERE staff_id = ?'
    ).bind(userId).first();

    const response = NextResponse.json({
      success: true,
      data: {
        cleaner: {
          name: `${cleaner.first_name} ${cleaner.last_name}`,
          paysheet_code: cleaner.paysheet_code,
          status: cleaner.status
        },
        training: {
          completion_percentage: trainingProgress?.completion_percentage || 0,
          completed: trainingProgress?.completed === 1
        },
        shifts: {
          upcoming: (upcomingShifts as any)?.count || 0
        },
        ratings: {
          average: (ratingResult as any)?.avg_rating || 0
        }
      }
    });
    response.headers.set('Cache-Control', 'private, max-age=30');
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Cleaner dashboard fetch error:', error);
    log.error('Failed to fetch cleaner dashboard data', error instanceof Error ? error : new Error(String(error)), { traceId, userId });
    
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Failed to fetch dashboard data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
