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

    // Get all users with their training status
    const trainingStatus = await trainingDb.prepare(
      `SELECT 
         etp.user_id,
         etp.training_status,
         etp.current_module_id,
         etp.next_unlock_at,
         u.name,
         u.email,
         u.role,
         u.department
       FROM employee_training_progress etp
       LEFT JOIN users u ON etp.user_id = u.id
       ORDER BY etp.training_status, u.name`
    ).all();

    // Get users who don't have training progress yet
    const usersWithoutProgress = await db.prepare(
      `SELECT 
         u.id as user_id,
         u.name,
         u.email,
         u.role,
         u.department
       FROM users u
       WHERE u.role IN ('cleaner', 'admin') 
       AND u.deleted = 0
       AND u.id NOT IN (SELECT user_id FROM employee_training_progress)
       ORDER BY u.name`
    ).all();

    // Combine results
    const allUsers = [
      ...(trainingStatus.results || []).map((row: any) => ({
        user_id: row.user_id,
        name: row.name,
        email: row.email,
        role: row.role,
        department: row.department,
        training_status: row.training_status || 'Not Started',
        current_module_id: row.current_module_id,
        next_unlock_at: row.next_unlock_at
      })),
      ...(usersWithoutProgress.results || []).map((row: any) => ({
        user_id: row.user_id,
        name: row.name,
        email: row.email,
        role: row.role,
        department: row.department,
        training_status: 'Not Started',
        current_module_id: null,
        next_unlock_at: null
      }))
    ];

    // Calculate summary statistics
    const summary = {
      total: allUsers.length,
      completed: allUsers.filter((u: any) => u.training_status === 'Completed').length,
      in_progress: allUsers.filter((u: any) => u.training_status === 'In Progress').length,
      not_started: allUsers.filter((u: any) => u.training_status === 'Not Started' || u.training_status === 'Trainee').length,
      trainee: allUsers.filter((u: any) => u.training_status === 'Trainee').length
    };

    const response = NextResponse.json({
      success: true,
      data: {
        users: allUsers,
        summary
      }
    });
    response.headers.set('Cache-Control', 'private, max-age=60');
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Training status fetch error:', error);
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch training status',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
