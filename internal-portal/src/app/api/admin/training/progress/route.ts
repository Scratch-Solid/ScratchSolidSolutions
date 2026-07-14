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
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

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

    let query = `
      SELECT 
        etp.user_id,
        etp.training_status,
        etp.current_module_id,
        etp.next_unlock_at,
        etp.started_at,
        etp.completed_at,
        u.name,
        u.email,
        u.role,
        u.department
      FROM employee_training_progress etp
      LEFT JOIN users u ON etp.user_id = u.id
    `;
    const params: any[] = [];

    if (userId) {
      query += ' WHERE etp.user_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY etp.started_at DESC';

    const progressData = await trainingDb.prepare(query).bind(...params).all();

    // Get quiz attempts for each user
    const userIds = (progressData.results || []).map((row: any) => row.user_id);
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

    // Get available modules for context
    const modules = await trainingDb.prepare(
      'SELECT id, title, module_order FROM training_modules_manifest ORDER BY module_order'
    ).all();

    const modulesMap = new Map();
    for (const module of (modules.results || [])) {
      modulesMap.set((module as any).id, module);
    }

    // Combine results with detailed progress
    const detailedProgress = (progressData.results || []).map((row: any) => {
      const currentModule = row.current_module_id ? modulesMap.get(row.current_module_id) : null;
      const attempts = quizAttemptsByUser.get(row.user_id) || [];
      
      // Calculate quiz statistics
      const totalAttempts = attempts.length;
      const passedAttempts = attempts.filter((a: any) => a.passed === 1).length;
      const averageScore = totalAttempts > 0 
        ? attempts.reduce((sum: number, a: any) => sum + a.score, 0) / totalAttempts 
        : 0;

      return {
        user_id: row.user_id,
        name: row.name,
        email: row.email,
        role: row.role,
        department: row.department,
        training_status: row.training_status,
        current_module: currentModule ? {
          id: currentModule.id,
          title: currentModule.title,
          order: currentModule.module_order
        } : null,
        started_at: row.started_at,
        completed_at: row.completed_at,
        next_unlock_at: row.next_unlock_at,
        quiz_statistics: {
          total_attempts: totalAttempts,
          passed_attempts: passedAttempts,
          average_score: Math.round(averageScore * 100) / 100
        },
        recent_attempts: attempts.slice(0, 5)
      };
    });

    const response = NextResponse.json({
      success: true,
      data: {
        progress: detailedProgress,
        total: detailedProgress.length,
        modules: modules.results || []
      }
    });
    response.headers.set('Cache-Control', 'private, max-age=60');
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Training progress fetch error:', error);
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Failed to fetch training progress: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
