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
    const moduleId = searchParams.get('module_id');
    const limit = parseInt(searchParams.get('limit') || '100');

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
        tqa.id,
        tqa.user_id,
        tqa.module_id,
        tqa.score,
        tqa.passed,
        tqa.attempt_date,
        u.name as user_name,
        u.email as user_email,
        tm.title as module_title,
        tm.module_order
      FROM training_quiz_attempts tqa
      LEFT JOIN users u ON tqa.user_id = u.id
      LEFT JOIN training_modules_manifest tm ON tqa.module_id = tm.id
    `;
    const conditions: string[] = [];
    const params: any[] = [];

    if (userId) {
      conditions.push('tqa.user_id = ?');
      params.push(userId);
    }

    if (moduleId) {
      conditions.push('tqa.module_id = ?');
      params.push(moduleId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY tqa.attempt_date DESC';

    if (limit > 0) {
      query += ' LIMIT ?';
      params.push(limit);
    }

    const quizAttempts = await trainingDb.prepare(query).bind(...params).all();

    // Calculate summary statistics
    const attempts = quizAttempts.results || [];
    const totalAttempts = attempts.length;
    const passedAttempts = attempts.filter((a: any) => a.passed === 1).length;
    const failedAttempts = attempts.filter((a: any) => a.passed === 0).length;
    const averageScore = totalAttempts > 0 
      ? attempts.reduce((sum: number, a: any) => sum + a.score, 0) / totalAttempts 
      : 0;

    // Group by user for summary
    const attemptsByUser = new Map();
    for (const attempt of attempts) {
      const uid = (attempt as any).user_id;
      if (!attemptsByUser.has(uid)) {
        attemptsByUser.set(uid, {
          user_id: uid,
          user_name: (attempt as any).user_name,
          user_email: (attempt as any).user_email,
          total_attempts: 0,
          passed_attempts: 0,
          average_score: 0
        });
      }
      const userStats = attemptsByUser.get(uid);
      userStats.total_attempts++;
      if ((attempt as any).passed === 1) {
        userStats.passed_attempts++;
      }
    }

    // Calculate per-user averages
    for (const [uid, stats] of attemptsByUser) {
      const userAttempts = attempts.filter((a: any) => a.user_id === uid);
      stats.average_score = userAttempts.length > 0
        ? userAttempts.reduce((sum: number, a: any) => sum + a.score, 0) / userAttempts.length
        : 0;
    }

    // Group by module for summary
    const attemptsByModule = new Map();
    for (const attempt of attempts) {
      const mid = (attempt as any).module_id;
      if (!attemptsByModule.has(mid)) {
        attemptsByModule.set(mid, {
          module_id: mid,
          module_title: (attempt as any).module_title,
          module_order: (attempt as any).module_order,
          total_attempts: 0,
          passed_attempts: 0,
          average_score: 0
        });
      }
      const moduleStats = attemptsByModule.get(mid);
      moduleStats.total_attempts++;
      if ((attempt as any).passed === 1) {
        moduleStats.passed_attempts++;
      }
    }

    // Calculate per-module averages
    for (const [mid, stats] of attemptsByModule) {
      const moduleAttempts = attempts.filter((a: any) => a.module_id === mid);
      stats.average_score = moduleAttempts.length > 0
        ? moduleAttempts.reduce((sum: number, a: any) => sum + a.score, 0) / moduleAttempts.length
        : 0;
    }

    const response = NextResponse.json({
      success: true,
      data: {
        attempts: attempts,
        summary: {
          total_attempts: totalAttempts,
          passed_attempts: passedAttempts,
          failed_attempts: failedAttempts,
          pass_rate: totalAttempts > 0 ? (passedAttempts / totalAttempts * 100).toFixed(2) : 0,
          average_score: Math.round(averageScore * 100) / 100
        },
        by_user: Array.from(attemptsByUser.values()),
        by_module: Array.from(attemptsByModule.values())
      }
    });
    response.headers.set('Cache-Control', 'private, max-age=60');
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Quiz attempts fetch error:', error);
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Failed to fetch quiz attempts: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
