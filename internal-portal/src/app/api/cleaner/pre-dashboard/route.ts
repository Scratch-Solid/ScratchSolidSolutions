export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { buildCleanerTrainingModules, ensureCleanerTrainingProgress } from '@/lib/cleaner-training';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { log } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['cleaner']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;
  const userId = authResult.user?.id;

  try {
    // Get cleaner profile
    const cleanerProfile = await db.prepare(
      'SELECT cp.paysheet_code, cp.first_name, cp.last_name FROM cleaner_profiles cp WHERE cp.user_id = ?'
    ).bind(userId).first();

    if (!cleanerProfile) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Cleaner profile not found',
          suggestion: 'Please contact support'
        }
      }, { status: 404 });
      return withSecurityHeaders(response, traceId);
    }

    const cleaner = cleanerProfile as any;

    // Get training progress
    const progress = await ensureCleanerTrainingProgress(db, cleaner.paysheet_code);
    const trainingModules = buildCleanerTrainingModules(progress);

    // Build progress tracker
    const progressTracker = {
      background_check_consent: {
        completed: progress.background_check_consent,
        completed_at: progress.background_check_consent_at
      },
      contract_signed: {
        completed: progress.contract_signed,
        completed_at: progress.contract_signed_at
      },
      training: {
        completed: progress.completed,
        completion_percentage: progress.completion_percentage,
        modules_completed: progress.modules_completed.length,
        modules_total: progress.modules_completed.length + progress.modules_pending.length,
        modules: trainingModules
      }
    };

    // Determine next step
    let nextStep = null;
    if (!progressTracker.background_check_consent.completed) {
      nextStep = 'background_check_consent';
    } else if (!progressTracker.contract_signed.completed) {
      nextStep = 'contract_sign';
    } else if (!progressTracker.training.completed) {
      nextStep = 'training';
    } else {
      nextStep = 'complete';
    }

    const response = NextResponse.json({
      success: true,
      data: {
        cleaner: {
          name: `${cleaner.first_name} ${cleaner.last_name}`,
          paysheet_code: cleaner.paysheet_code
        },
        progress_tracker: progressTracker,
        next_step: nextStep,
        onboarding_state: nextStep === 'complete' ? 'active' : nextStep,
        can_transition_to_cleaner_dashboard: progress.completed
      }
    });
    response.headers.set('Cache-Control', 'private, max-age=30');
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Pre-dashboard fetch error:', error);
    log.error('Failed to fetch pre-dashboard data', error instanceof Error ? error : new Error(String(error)), { traceId, userId });
    
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Failed to fetch onboarding status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
