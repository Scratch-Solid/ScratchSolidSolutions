export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getTrainingDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders, withCsrf } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);

  // CSRF protection
  const csrfResult = await withCsrf(request);
  if (csrfResult) return withSecurityHeaders(csrfResult, traceId);

  const trainingDb = await getTrainingDb();
  if (!trainingDb) {
    return withSecurityHeaders(
      NextResponse.json({ error: 'Training database not available' }, { status: 500 }),
      traceId
    );
  }

  try {
    const body = await request.json() as {
      userId: string;
    };

    const { userId } = body;

    if (!userId) {
      return withSecurityHeaders(
        NextResponse.json({ error: 'userId required' }, { status: 400 }),
        traceId
      );
    }

    // Admin bypass: remove time constraint for manual testing or emergency staff sign-offs
    await trainingDb.prepare(
      `UPDATE employee_training_progress 
       SET next_unlock_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`
    ).bind(userId).run();

    return withSecurityHeaders(
      NextResponse.json({ 
        status: "bypassed", 
        message: "Time constraint bypassed successfully" 
      }),
      traceId
    );

  } catch (error) {
    console.error('Training bypass error:', error);
    return withSecurityHeaders(
      NextResponse.json({ error: `Failed to bypass training lock: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 }),
      traceId
    );
  }
}
