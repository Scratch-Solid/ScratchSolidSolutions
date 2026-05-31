export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { getTrainingDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const trainingDb = await getTrainingDb();
    if (!trainingDb) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Training database not available',
          details: {},
          suggestion: 'Please try again later or contact support if the issue persists'
        }
      }, { status: 500 });
      return withSecurityHeaders(response, traceId);
    }

    // Get users with pending training (not completed, not in progress)
    const pendingUsers = await trainingDb.prepare(
      `SELECT 
         etp.user_id,
         etp.training_status,
         etp.current_module_id,
         etp.next_unlock_at,
         u.name,
         u.email,
         u.role,
         u.department,
         u.created_at as user_created_at
       FROM employee_training_progress etp
       LEFT JOIN users u ON etp.user_id = u.id
       WHERE etp.training_status IN ('Trainee', 'Not Started')
       ORDER BY u.name`
    ).all();

    // Get users who don't have training progress at all
    const usersWithoutProgress = await db.prepare(
      `SELECT 
         u.id as user_id,
         u.name,
         u.email,
         u.role,
         u.department,
         u.created_at as user_created_at
       FROM users u
       WHERE u.role IN ('cleaner', 'admin') 
       AND u.deleted = 0
       AND u.id NOT IN (SELECT user_id FROM employee_training_progress)
       ORDER BY u.name`
    ).all();

    // Combine results - both groups are considered "pending"
    const allPending = [
      ...(pendingUsers.results || []).map((row: any) => ({
        user_id: row.user_id,
        name: row.name,
        email: row.email,
        role: row.role,
        department: row.department,
        user_created_at: row.user_created_at,
        training_status: row.training_status,
        current_module_id: row.current_module_id,
        next_unlock_at: row.next_unlock_at,
        has_progress: true
      })),
      ...(usersWithoutProgress.results || []).map((row: any) => ({
        user_id: row.user_id,
        name: row.name,
        email: row.email,
        role: row.role,
        department: row.department,
        user_created_at: row.user_created_at,
        training_status: 'Not Started',
        current_module_id: null,
        next_unlock_at: null,
        has_progress: false
      }))
    ];

    const response = NextResponse.json({
      success: true,
      data: {
        users: allPending,
        total: allPending.length,
        without_progress: (usersWithoutProgress.results || []).length,
        with_progress: (pendingUsers.results || []).length
      }
    });
    response.headers.set('Cache-Control', 'private, max-age=60');
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Pending training fetch error:', error);
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch pending training data',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
