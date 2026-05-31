export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
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

    // Get training progress
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

    // Parse JSON fields
    const modulesCompleted = JSON.parse(progress.modules_completed || '[]');
    const modulesPending = JSON.parse(progress.modules_pending || '[]');

    // Get training modules from the training database
    // TODO: Connect to training database and fetch actual modules
    // For now, return placeholder modules
    const trainingModules = [
      {
        id: 'module-1',
        title: 'Introduction to Cleaning Services',
        description: 'Learn about our cleaning standards and procedures',
        duration: '30 minutes',
        completed: modulesCompleted.includes('module-1')
      },
      {
        id: 'module-2',
        title: 'Safety Protocols',
        description: 'Essential safety guidelines and procedures',
        duration: '45 minutes',
        completed: modulesCompleted.includes('module-2')
      },
      {
        id: 'module-3',
        title: 'Customer Service Excellence',
        description: 'How to provide exceptional customer service',
        duration: '40 minutes',
        completed: modulesCompleted.includes('module-3')
      },
      {
        id: 'module-4',
        title: 'Equipment Handling',
        description: 'Proper use and maintenance of cleaning equipment',
        duration: '35 minutes',
        completed: modulesCompleted.includes('module-4')
      },
      {
        id: 'module-5',
        title: 'Chemical Safety',
        description: 'Safe handling of cleaning chemicals',
        duration: '30 minutes',
        completed: modulesCompleted.includes('module-5')
      }
    ];

    const response = NextResponse.json({
      success: true,
      data: {
        modules: trainingModules,
        progress: {
          completed: modulesCompleted.length,
          total: trainingModules.length,
          percentage: progress.completion_percentage
        }
      }
    });
    response.headers.set('Cache-Control', 'private, max-age=60');
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Training modules fetch error:', error);
    log.error('Failed to fetch training modules', error instanceof Error ? error : new Error(String(error)), { traceId, userId });
    
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch training modules',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
