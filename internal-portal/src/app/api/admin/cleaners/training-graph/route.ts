export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { log } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;
  const userId = authResult.user?.id;

  try {
    // Get training completion statistics
    const totalCleaners = await db.prepare(
      'SELECT COUNT(*) as count FROM cleaner_profiles'
    ).first();

    const completedTraining = await db.prepare(
      'SELECT COUNT(*) as count FROM training_progress WHERE completed = 1'
    ).first();

    const inProgress = await db.prepare(
      'SELECT COUNT(*) as count FROM training_progress WHERE completed = 0 AND completion_percentage > 0'
    ).first();

    const notStarted = await db.prepare(
      'SELECT COUNT(*) as count FROM training_progress WHERE completion_percentage = 0'
    ).first();

    const total = (totalCleaners as any)?.count || 0;
    const completed = (completedTraining as any)?.count || 0;
    const inProgressCount = (inProgress as any)?.count || 0;
    const notStartedCount = (notStarted as any)?.count || 0;
    const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    const highProgressResult = await db.prepare(
      'SELECT COUNT(*) as count FROM training_progress WHERE completion_percentage >= 75 AND completion_percentage < 100'
    ).first();
    const midProgressResult = await db.prepare(
      'SELECT COUNT(*) as count FROM training_progress WHERE completion_percentage >= 25 AND completion_percentage < 75'
    ).first();
    const highProgress = (highProgressResult as any)?.count || 0;
    const midProgress = (midProgressResult as any)?.count || 0;
    const completionRanges = [
      { label: '0%', count: notStartedCount },
      { label: '25-74%', count: midProgress },
      { label: '75-99%', count: highProgress },
      { label: '100%', count: completed },
    ].map((range) => ({
      ...range,
      percentage: total > 0 ? Math.round((range.count / total) * 100) : 0,
    }));

    const response = NextResponse.json({
      success: true,
      data: {
        total_cleaners: total,
        completed_training: completed,
        in_progress: inProgressCount,
        not_started: notStartedCount,
        completion_percentage: completionPercentage,
        completion_ranges: completionRanges
      }
    });
    response.headers.set('Cache-Control', 'private, max-age=300');
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Training graph fetch error:', error);
    log.error('Failed to fetch training graph data', error instanceof Error ? error : new Error(String(error)), { traceId, userId });
    
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Failed to fetch training graph data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
