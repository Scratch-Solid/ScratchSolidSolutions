export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { completeCleanerTrainingModule, countModulesCompletedInLast24h, ensureCleanerTrainingProgress, getCleanerTrainingModule, MAX_MODULES_PER_DAY, setCleanerOnboardingStage } from '@/lib/cleaner-training';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { log } from '@/lib/logger';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['cleaner', 'staff']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;
  const userId = authResult.user?.id;

  const { id } = await params;
  try {
    const moduleId = id;

    const module = getCleanerTrainingModule(moduleId);
    if (!module) {
      const response = NextResponse.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Unknown training module' }
      }, { status: 404 });
      return withSecurityHeaders(response, traceId);
    }

    const body = await request.json().catch(() => ({})) as { answers?: number[] };
    const answers = Array.isArray(body.answers) ? body.answers : [];

    if (answers.length !== module.quiz.length) {
      const response = NextResponse.json({
        success: false,
        error: { code: 'INVALID_SUBMISSION', message: `Expected ${module.quiz.length} answers, got ${answers.length}` }
      }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    const correctCount = module.quiz.reduce(
      (count, question, index) => count + (answers[index] === question.correctAnswerIndex ? 1 : 0),
      0
    );
    const scorePercentage = Math.round((correctCount / module.quiz.length) * 100);
    const passed = scorePercentage === 100;

    if (!passed) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'QUIZ_FAILED',
          message: `You scored ${correctCount}/${module.quiz.length}. All questions must be answered correctly to pass.`,
          score: scorePercentage,
        }
      }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // Get cleaner profile
    const cleanerProfile = await db.prepare(
      'SELECT s.paysheet_code FROM staff s WHERE s.user_id = ?'
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

    // Get current training progress
    const progress = await ensureCleanerTrainingProgress(db, cleaner.paysheet_code);

    // Reaching here means they just answered every question correctly. If
    // this module was already marked complete (e.g. a review retake), that's
    // still a pass - not an error - so respond with success rather than
    // surfacing "already completed" as if the quiz had failed.
    if (progress.modules_completed.includes(moduleId)) {
      const totalModules = progress.modules_completed.length + progress.modules_pending.length;
      const response = NextResponse.json({
        success: true,
        message: 'Already completed - nice review!',
        data: {
          module_id: moduleId,
          completed: progress.modules_completed.length,
          total: totalModules,
          percentage: progress.completion_percentage,
          all_completed: progress.completed,
          can_transition_to_cleaner_dashboard: progress.completed
        }
      });
      return withSecurityHeaders(response, traceId);
    }

    // Genuinely new completion (not a review-retake, already handled above) -
    // enforce the daily pacing cap before recording it.
    const completedToday = countModulesCompletedInLast24h(progress.modules_completed_at);
    if (completedToday >= MAX_MODULES_PER_DAY) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'DAILY_LIMIT_REACHED',
          message: `You've completed ${MAX_MODULES_PER_DAY} modules in the last 24 hours - come back tomorrow to continue.`,
        }
      }, { status: 429 });
      return withSecurityHeaders(response, traceId);
    }

    const updatedProgress = completeCleanerTrainingModule(progress, moduleId);
    const totalModules = updatedProgress.modules_completed.length + updatedProgress.modules_pending.length;

    // Update training progress
    await db.prepare(
      `UPDATE training_progress
       SET modules_completed = ?, modules_pending = ?, modules_completed_at = ?, completion_percentage = ?, completed = ?, updated_at = datetime('now')
       WHERE employee_id = ?`
    ).bind(
      JSON.stringify(updatedProgress.modules_completed),
      JSON.stringify(updatedProgress.modules_pending),
      JSON.stringify(updatedProgress.modules_completed_at),
      updatedProgress.completion_percentage,
      updatedProgress.completed ? 1 : 0,
      cleaner.paysheet_code
    ).run();
    if (updatedProgress.all_completed) {
      await setCleanerOnboardingStage(db, Number(userId), 'training_completed');
    }

    // Log audit event
    log.audit('TRAINING_MODULE_COMPLETED', 'cleaner', {
      traceId,
      userId,
      paysheetCode: cleaner.paysheet_code,
      moduleId,
      completionPercentage: updatedProgress.completion_percentage
    });

    const response = NextResponse.json({
      success: true,
      message: 'Module completed successfully',
      data: {
        module_id: moduleId,
        completed: updatedProgress.modules_completed.length,
        total: totalModules,
        percentage: updatedProgress.completion_percentage,
        all_completed: updatedProgress.all_completed,
        can_transition_to_cleaner_dashboard: updatedProgress.all_completed
      }
    });
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Training module completion error:', error);
    log.error('Failed to complete training module', error instanceof Error ? error : new Error(String(error)), { traceId, userId, moduleId: id });
    
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Failed to complete module: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
