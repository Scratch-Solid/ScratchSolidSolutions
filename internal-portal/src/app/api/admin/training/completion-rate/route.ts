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
    const days = parseInt(searchParams.get('days') || '30'); // default to last 30 days

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

    // Calculate date range
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    // Get completion statistics
    const totalUsers = await db.prepare(
      `SELECT COUNT(*) as count FROM users 
       WHERE role IN ('cleaner', 'admin') AND deleted = 0`
    ).first();

    const completedUsers = await trainingDb.prepare(
      `SELECT COUNT(*) as count FROM employee_training_progress 
       WHERE training_status = 'Completed'`
    ).first();

    const inProgressUsers = await trainingDb.prepare(
      `SELECT COUNT(*) as count FROM employee_training_progress 
       WHERE training_status = 'In Progress'`
    ).first();

    const notStartedUsers = await trainingDb.prepare(
      `SELECT COUNT(*) as count FROM employee_training_progress 
       WHERE training_status IN ('Trainee', 'Not Started')`
    ).first();

    // Get completions in the date range
    const recentCompletions = await trainingDb.prepare(
      `SELECT COUNT(*) as count FROM employee_training_progress 
       WHERE training_status = 'Completed' 
       AND completed_at >= ? AND completed_at <= ?`
    ).bind(startDateStr, todayStr).first();

    // Get daily completion trend
    const dailyCompletions = await trainingDb.prepare(
      `SELECT 
         DATE(completed_at) as date,
         COUNT(*) as count
       FROM employee_training_progress
       WHERE training_status = 'Completed'
       AND completed_at >= ? AND completed_at <= ?
       GROUP BY DATE(completed_at)
       ORDER BY date ASC`
    ).bind(startDateStr, todayStr).all();

    // Fill in missing dates with zero completions
    const trendData: any[] = [];
    const dateMap = new Map();
    
    for (const row of (dailyCompletions.results || [])) {
      dateMap.set((row as any).date, row);
    }

    const currentDate = new Date(startDate);
    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const data = dateMap.get(dateStr);
      
      trendData.push({
        date: dateStr,
        completions: data ? (data as any).count : 0
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate completion rate
    const total = (totalUsers as any)?.count || 0;
    const completed = (completedUsers as any)?.count || 0;
    const completionRate = total > 0 ? (completed / total * 100).toFixed(2) : 0;

    const response = NextResponse.json({
      success: true,
      data: {
        period: {
          start: startDateStr,
          end: todayStr,
          days
        },
        overall: {
          total_users: total,
          completed: completed,
          in_progress: (inProgressUsers as any)?.count || 0,
          not_started: (notStartedUsers as any)?.count || 0,
          completion_rate: parseFloat(completionRate as string)
        },
        recent_completions: (recentCompletions as any)?.count || 0,
        trend: trendData
      }
    });
    response.headers.set('Cache-Control', 'private, max-age=60');
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Completion rate fetch error:', error);
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch completion rate statistics',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
