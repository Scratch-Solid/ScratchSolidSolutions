export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { completeCleanerTrainingModule, ensureCleanerTrainingProgress, setCleanerOnboardingStage } from '@/lib/cleaner-training';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { log } from '@/lib/logger';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['cleaner']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;
  const userId = authResult.user?.id;

  const { id } = await params;
  try {
    const moduleId = id;

    // Get cleaner profile
    const cleanerProfile = await db.prepare(
      'SELECT cp.paysheet_code FROM cleaner_profiles cp WHERE cp.user_id = ?'
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

    // Check if module is already completed
    if (progress.modules_completed.includes(moduleId)) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'ALREADY_COMPLETED',
          message: 'Module already completed',
          suggestion: 'This module has already been marked as complete'
        }
      }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    const updatedProgress = completeCleanerTrainingModule(progress, moduleId);
    const totalModules = updatedProgress.modules_completed.length + updatedProgress.modules_pending.length;

    // Update training progress
    await db.prepare(
      `UPDATE training_progress 
       SET modules_completed = ?, modules_pending = ?, completion_percentage = ?, completed = ?, updated_at = datetime('now')
       WHERE employee_id = ?`
    ).bind(
      JSON.stringify(updatedProgress.modules_completed),
      JSON.stringify(updatedProgress.modules_pending),
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
