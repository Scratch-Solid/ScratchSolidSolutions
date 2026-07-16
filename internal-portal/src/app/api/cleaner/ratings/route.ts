export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { parsePaginationParams, calculatePagination } from '@/lib/pagination';
import { log } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['cleaner']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;
  const userId = authResult.user?.id;

  try {
    // Get cleaner profile
    const cleanerProfile = await db.prepare(
      'SELECT cp.paysheet_code FROM cleaner_profiles cp WHERE cp.user_id = ?'
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

    // Get ratings
    const ratingsQuery = `
      SELECT 
        id,
        client_id,
        rating,
        client_feedback,
        adherence_score,
        attendance_score,
        company_values_score,
        created_at
      FROM job_performance_metrics
      WHERE employee_id = ?
      ORDER BY created_at DESC
    `;

    // Get total count
    const countResult = await db.prepare(
      'SELECT COUNT(*) as count FROM job_performance_metrics WHERE employee_id = ?'
    ).bind(cleaner.paysheet_code).first();
    const total = (countResult as any)?.count || 0;

    // Get paginated results
    const ratings = await db.prepare(ratingsQuery + ' LIMIT ? OFFSET ?')
      .bind(cleaner.paysheet_code, limit, offset)
      .all();

    // Calculate average rating
    const avgRatingResult = await db.prepare(
      'SELECT AVG(rating) as avg_rating FROM job_performance_metrics WHERE employee_id = ?'
    ).bind(cleaner.paysheet_code).first();

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
