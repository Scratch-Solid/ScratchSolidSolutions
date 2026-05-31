export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { log } from '@/lib/logger';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['cleaner']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;
  const userId = authResult.user?.id;

  try {
    const moduleId = params.id;

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
    const trainingProgress = await db.prepare(
      'SELECT * FROM training_progress WHERE employee_id = ?'
    ).bind(cleaner.paysheet_code).first();

    if (!trainingProgress) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Training progress not found',
          suggestion: 'Please contact support'
        }
      }, { status: 404 });
      return withSecurityHeaders(response, traceId);
    }

    const progress = trainingProgress as any;

    // Parse current modules
    const modulesCompleted = JSON.parse(progress.modules_completed || '[]');
    const modulesPending = JSON.parse(progress.modules_pending || '[]');

    // Check if module is already completed
    if (modulesCompleted.includes(moduleId)) {
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

    // Add module to completed list
    modulesCompleted.push(moduleId);

    // Remove from pending list if present
    const pendingIndex = modulesPending.indexOf(moduleId);
    if (pendingIndex > -1) {
      modulesPending.splice(pendingIndex, 1);
    }

    // Calculate completion percentage
    const totalModules = modulesCompleted.length + modulesPending.length;
    const completionPercentage = totalModules > 0 ? Math.round((modulesCompleted.length / totalModules) * 100) : 0;

    // Check if all modules are completed
    const allCompleted = modulesPending.length === 0;

    // Update training progress
    await db.prepare(
      `UPDATE training_progress 
       SET modules_completed = ?, modules_pending = ?, completion_percentage = ?, completed = ?, updated_at = datetime('now')
       WHERE employee_id = ?`
    ).bind(
      JSON.stringify(modulesCompleted),
      JSON.stringify(modulesPending),
      completionPercentage,
      allCompleted ? 1 : 0,
      cleaner.paysheet_code
    ).run();

    // Log audit event
    log.audit('TRAINING_MODULE_COMPLETED', 'cleaner', {
      traceId,
      userId,
      paysheetCode: cleaner.paysheet_code,
      moduleId,
      completionPercentage
    });

    const response = NextResponse.json({
      success: true,
      message: 'Module completed successfully',
      data: {
        module_id: moduleId,
        completed: modulesCompleted.length,
        total: totalModules,
        percentage: completionPercentage,
        all_completed: allCompleted,
        can_transition_to_cleaner_dashboard: allCompleted
      }
    });
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Training module completion error:', error);
    log.error('Failed to complete training module', error instanceof Error ? error : new Error(String(error)), { traceId, userId, moduleId: params.id });
    
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to complete module',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
