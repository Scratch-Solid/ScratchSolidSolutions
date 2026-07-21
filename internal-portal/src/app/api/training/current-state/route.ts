export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getTrainingDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['cleaner', 'admin', 'staff']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { user } = authResult;

  const trainingDb = await getTrainingDb();
  if (!trainingDb) {
    return withSecurityHeaders(
      NextResponse.json({ error: 'Training database not available' }, { status: 500 }),
      traceId
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return withSecurityHeaders(
        NextResponse.json({ error: 'user_id required' }, { status: 400 }),
        traceId
      );
    }

    // Get user's training progress
    const progress = await trainingDb.prepare(
      'SELECT * FROM employee_training_progress WHERE user_id = ?'
    ).bind(userId).first();

    if (!progress) {
      // Initialize new progress record
      await trainingDb.prepare(
        `INSERT INTO employee_training_progress (user_id, training_status, current_module_id, next_unlock_at)
         VALUES (?, 'Trainee', 1, datetime('now'))`
      ).bind(userId).run();
      
      const newProgress = await trainingDb.prepare(
        'SELECT * FROM employee_training_progress WHERE user_id = ?'
      ).bind(userId).first();

      // Same response shape as the existing-progress path below - the
      // frontend (CleanerDashboard.tsx) always reads response.progress, so
      // returning the row bare here left a brand-new user's first Training
      // tab load with undefined progress.
      return withSecurityHeaders(NextResponse.json({ progress: newProgress, attempts: [] }), traceId);
    }

    // Get quiz attempt history for this user
    const attempts = await trainingDb.prepare(
      'SELECT * FROM training_quiz_attempts WHERE user_id = ? ORDER BY attempted_at DESC LIMIT 20'
    ).bind(userId).all();

    return withSecurityHeaders(
      NextResponse.json({
        progress,
        attempts: attempts.results || []
      }),
      traceId
    );

  } catch (error) {
    console.error('Error fetching training state:', error);
    return withSecurityHeaders(
      NextResponse.json({ error: `Failed to fetch training state: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 }),
      traceId
    );
  }
}
