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
  // validateSession() returns the sessions row joined with the user - .id
  // here is the session row's own primary key, not the user's id. .user_id
  // is the actual FK to users(id) and must be checked first.
  const userId = (authResult.user as any)?.user_id || authResult.user?.id;

  try {
    // Get cleaner profile
    const cleanerProfile = await db.prepare(
      'SELECT cp.id, cp.paysheet_code FROM cleaner_profiles cp WHERE cp.user_id = ?'
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

    // Get upcoming shifts. booking_assignments links via staff_id (an
    // integer matching cleaner_profiles.id), not cleaner_id - that column
    // doesn't exist on this table. bookings has no client_id column either,
    // the client is bookings.user_id.
    const shiftsQuery = `
      SELECT
        b.id,
        b.booking_date,
        b.time_slot,
        b.status,
        b.user_id,
        b.location,
        b.suburb,
        b.service_type,
        ba.created_at AS assigned_at
      FROM booking_assignments ba
      JOIN bookings b ON ba.booking_id = b.id
      WHERE ba.staff_id = ? AND b.booking_date >= date('now') AND b.status != 'cancelled'
      ORDER BY b.booking_date ASC, b.time_slot ASC
    `;

    // Get total count
    const countResult = await db.prepare(
      `SELECT COUNT(*) as count FROM booking_assignments ba
       JOIN bookings b ON ba.booking_id = b.id
       WHERE ba.staff_id = ? AND b.booking_date >= date('now') AND b.status != 'cancelled'`
    ).bind(cleaner.id).first();
    const total = (countResult as any)?.count || 0;

    // Get paginated results
    const shifts = await db.prepare(shiftsQuery + ' LIMIT ? OFFSET ?')
      .bind(cleaner.id, limit, offset)
      .all();

    const response = NextResponse.json({
      success: true,
      data: shifts.results || [],
      pagination: calculatePagination(page, limit, total)
    });
    response.headers.set('Cache-Control', 'private, max-age=60');
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Shifts fetch error:', error);
    log.error('Failed to fetch shifts', error instanceof Error ? error : new Error(String(error)), { traceId, userId });
    
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Failed to fetch shifts: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
