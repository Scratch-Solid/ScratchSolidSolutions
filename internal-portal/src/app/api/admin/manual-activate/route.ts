export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb, activateUserAfterTraining, logOnboardingTransition } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders, withCsrf } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  // CSRF protection
  const csrfResult = await withCsrf(request);
  if (csrfResult) return withSecurityHeaders(csrfResult, traceId);

  try {
    const body = await request.json() as {
      userId: number;
      reason?: string;
    };

    const { userId, reason = 'manual_activation' } = body;

    if (!userId) {
      return withSecurityHeaders(
        NextResponse.json({ error: 'userId is required' }, { status: 400 }),
        traceId
      );
    }

    // Check if user exists
    const user = await db.prepare('SELECT id, onboarding_stage FROM users WHERE id = ?').bind(userId).first();
    if (!user) {
      return withSecurityHeaders(
        NextResponse.json({ error: 'User not found' }, { status: 404 }),
        traceId
      );
    }

    const currentStage = (user as any).onboarding_stage;
    const ip = request.headers.get('x-forwarded-for') || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    // Update users table onboarding_stage to active
    await db.prepare('UPDATE users SET onboarding_stage = ? WHERE id = ?').bind('active', userId).run();

    // Update staff table
    await db.prepare(`
      UPDATE staff 
      SET training_completed = 1, 
          onboarding_stage = 'active',
          is_active = 1,
          updated_at = datetime('now')
      WHERE user_id = ?
    `).bind(userId).run();

    // Log the manual activation
    await logOnboardingTransition(db, {
      user_id: userId,
      from_stage: currentStage || 'contract_signed',
      to_stage: 'active',
      event_type: 'manual_activation',
      metadata: { activation_reason: reason, activated_by: (authResult as any).user.id },
      ip_address: ip,
      user_agent: userAgent
    });

    return withSecurityHeaders(
      NextResponse.json({ 
        success: true,
        message: 'User activated successfully',
        userId,
        previousStage: currentStage,
        newStage: 'active'
      }),
      traceId
    );
  } catch (error) {
    console.error('Manual activation error:', error);
    return withSecurityHeaders(
      NextResponse.json({ error: 'Failed to activate user' }, { status: 500 }),
      traceId
    );
  }
}
