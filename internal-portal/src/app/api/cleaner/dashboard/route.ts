export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
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
      'SELECT cp.paysheet_code, cp.first_name, cp.last_name, cp.status FROM cleaner_profiles cp WHERE cp.user_id = ?'
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

    // Get upcoming shifts count
    const upcomingShifts = await db.prepare(
      `SELECT COUNT(*) as count FROM booking_assignments ba 
       JOIN bookings b ON ba.booking_id = b.id 
       WHERE ba.cleaner_id = ? AND b.scheduled_date >= date('now') AND b.status != 'cancelled'`
    ).bind(cleaner.paysheet_code).first();

    // Get average rating
    const ratingResult = await db.prepare(
      'SELECT AVG(rating) as avg_rating FROM job_performance_metrics WHERE employee_id = ?'
    ).bind(cleaner.paysheet_code).first();

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
        message: 'Failed to fetch dashboard data',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
