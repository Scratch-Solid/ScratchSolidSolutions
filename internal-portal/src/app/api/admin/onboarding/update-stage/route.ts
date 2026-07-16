export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withSecurityHeaders, withTracing, withCsrf } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  const csrfResponse = await withCsrf(request);
  if (csrfResponse) return withSecurityHeaders(csrfResponse, traceId);

  try {
    const body = await request.json() as { userId: number; newStage: string };
    const { userId, newStage } = body;

    if (!userId || !newStage) {
      return withSecurityHeaders(NextResponse.json({ error: 'Missing required fields' }, { status: 400 }), traceId);
    }

    // Update user's onboarding stage
    await db.prepare(`
      UPDATE users SET onboarding_stage = ? WHERE id = ?
    `).bind(newStage, userId).run();

    // Log the stage transition
    await db.prepare(`
      INSERT INTO onboarding_audit (user_id, from_stage, to_stage, changed_by, changed_at)
      VALUES (?, (SELECT onboarding_stage FROM users WHERE id = ?), ?, 'admin', datetime('now'))
    `).bind(userId, userId, newStage).run();

    return withSecurityHeaders(NextResponse.json({ success: true }), traceId);
  } catch (error) {
    console.error('Update stage error:', error);
    return withSecurityHeaders(NextResponse.json({ error: `Failed to update stage: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 }), traceId);
  }
}
