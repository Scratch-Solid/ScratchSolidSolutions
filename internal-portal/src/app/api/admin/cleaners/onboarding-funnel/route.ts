export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { log } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;
  const userId = authResult.user?.id;

  try {
    // Get onboarding funnel statistics
    const totalCleaners = await db.prepare(
      'SELECT COUNT(*) as count FROM cleaner_profiles'
    ).first();
    const consentSigned = await db.prepare(
      'SELECT COUNT(*) as count FROM training_progress WHERE background_check_consent = 1'
    ).first();

    const contractsSigned = await db.prepare(
      'SELECT COUNT(*) as count FROM training_progress WHERE contract_signed = 1'
    ).first();

    const trainingStarted = await db.prepare(
      'SELECT COUNT(*) as count FROM training_progress WHERE completion_percentage > 0'
    ).first();

    const trainingCompleted = await db.prepare(
      'SELECT COUNT(*) as count FROM training_progress WHERE completed = 1'
    ).first();
    const total = (totalCleaners as any)?.count || 0;
    const stages = [
      { stage: 'Consent Signed', count: (consentSigned as any)?.count || 0 },
      { stage: 'Contract Signed', count: (contractsSigned as any)?.count || 0 },
      { stage: 'Training Started', count: (trainingStarted as any)?.count || 0 },
      { stage: 'Training Completed', count: (trainingCompleted as any)?.count || 0 },
    ].map((stage) => ({
      ...stage,
      percentage: total > 0 ? Math.round((stage.count / total) * 100) : 0,
    }));

    const response = NextResponse.json({
      success: true,
      data: {
        consent_signed: (consentSigned as any)?.count || 0,
        contracts_signed: (contractsSigned as any)?.count || 0,
        training_started: (trainingStarted as any)?.count || 0,
        training_completed: (trainingCompleted as any)?.count || 0,
        stages
      }
    });
    response.headers.set('Cache-Control', 'private, max-age=300');
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Onboarding funnel fetch error:', error);
    log.error('Failed to fetch onboarding funnel data', error instanceof Error ? error : new Error(String(error)), { traceId, userId });
    
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch onboarding funnel data',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
