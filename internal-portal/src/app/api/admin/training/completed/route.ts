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

    // Get users who have completed training
    const completedUsers = await trainingDb.prepare(
      `SELECT 
         etp.user_id,
         etp.current_module_id,
         etp.next_unlock_at,
         u.name,
         u.email,
         u.role,
         u.department,
         u.created_at as user_created_at
       FROM employee_training_progress etp
       LEFT JOIN users u ON etp.user_id = u.id
       WHERE etp.training_status = 'Completed'
       ORDER BY etp.next_unlock_at DESC`
    ).all();

    // Get quiz attempt details for completed users
    const userIds = (completedUsers.results || []).map((row: any) => row.user_id);
    let quizAttempts: any[] = [];
    
    if (userIds.length > 0) {
      const placeholders = userIds.map(() => '?').join(',');
      const attemptsQuery = await trainingDb.prepare(
        `SELECT 
           user_id,
           module_id,
           score,
           passed,
           attempt_date
         FROM training_quiz_attempts
         WHERE user_id IN (${placeholders})
         ORDER BY user_id, attempt_date DESC`
      ).bind(...userIds).all();
      
      quizAttempts = attemptsQuery.results || [];
    }

    // Group quiz attempts by user
    const quizAttemptsByUser = new Map();
    for (const attempt of quizAttempts) {
      if (!quizAttemptsByUser.has(attempt.user_id)) {
        quizAttemptsByUser.set(attempt.user_id, []);
      }
      quizAttemptsByUser.get(attempt.user_id).push(attempt);
    }

    // Combine results
    const usersWithDetails = (completedUsers.results || []).map((row: any) => ({
      user_id: row.user_id,
      name: row.name,
      email: row.email,
      role: row.role,
      department: row.department,
      user_created_at: row.user_created_at,
      current_module_id: row.current_module_id,
      completion_date: row.next_unlock_at,
      quiz_attempts: quizAttemptsByUser.get(row.user_id) || []
    }));

    const response = NextResponse.json({
      success: true,
      data: {
        users: usersWithDetails,
        total: usersWithDetails.length
      }
    });
    response.headers.set('Cache-Control', 'private, max-age=60');
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Completed training fetch error:', error);
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Failed to fetch completed training data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
