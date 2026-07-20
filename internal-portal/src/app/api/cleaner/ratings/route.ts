export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { parsePaginationParams, calculatePagination } from '@/lib/pagination';
import { log } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['cleaner', 'staff']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;
  // validateSession() returns the sessions row joined with the user - .id
  // here is the session row's own primary key, not the user's id. .user_id
  // is the actual FK to users(id) and must be checked first.
  const userId = (authResult.user as any)?.user_id || authResult.user?.id;

  try {
    // Get cleaner profile
    const cleanerProfile = await db.prepare(
      'SELECT s.paysheet_code FROM staff s WHERE s.user_id = ?'
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

    const { searchParams } = new URL(request.url);
    const { page, limit, offset } = parsePaginationParams({
      page: searchParams.get('page'),
      limit: searchParams.get('limit')
    });

    // Get ratings. job_performance_metrics keys on staff_id (matching
    // users.id, the same id GPS/WhatsApp confirmation writes use) - it has
    // no employee_id/client_id/rating/client_feedback columns, those were
    // never real column names on this table.
    const ratingsQuery = `
      SELECT
        id,
        booking_id,
        client_rating,
        notes,
        adherence_score,
        attendance_score,
        company_values_score,
        recorded_at AS created_at
      FROM job_performance_metrics
      WHERE staff_id = ?
      ORDER BY recorded_at DESC
    `;

    // Get total count
    const countResult = await db.prepare(
      'SELECT COUNT(*) as count FROM job_performance_metrics WHERE staff_id = ?'
    ).bind(userId).first();
    const total = (countResult as any)?.count || 0;

    // Get paginated results
    const ratings = await db.prepare(ratingsQuery + ' LIMIT ? OFFSET ?')
      .bind(userId, limit, offset)
      .all();

    // Calculate average rating
    const avgRatingResult = await db.prepare(
      'SELECT AVG(client_rating) as avg_rating FROM job_performance_metrics WHERE staff_id = ?'
    ).bind(userId).first();

    const response = NextResponse.json({
      success: true,
      data: {
        ratings: ratings.results || [],
        average_rating: (avgRatingResult as any)?.avg_rating || 0,
        total_ratings: total
      },
      pagination: calculatePagination(page, limit, total)
    });
    response.headers.set('Cache-Control', 'private, max-age=60');
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Ratings fetch error:', error);
    log.error('Failed to fetch ratings', error instanceof Error ? error : new Error(String(error)), { traceId, userId });
    
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Failed to fetch ratings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
