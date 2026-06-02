export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { cleanupExpiredData } from '@/lib/data-retention';
import { log } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;
  const userId = authResult.user?.id;

  try {
    const result = await cleanupExpiredData(db);

    log.audit('DATA_RETENTION_CLEANUP', 'admin', {
      traceId,
      userId,
      deleted: result.deleted,
      errors: result.errors,
    });

    if (result.errors.length > 0) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'PARTIAL_CLEANUP',
          message: 'Some cleanup operations failed',
          details: { errors: result.errors },
          suggestion: 'Review the errors and retry if necessary'
        }
      }, { status: 207 });
      return withSecurityHeaders(response, traceId);
    }

    const response = NextResponse.json({
      success: true,
      data: {
        deleted: result.deleted,
        message: 'Data retention cleanup completed successfully'
      }
    });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    log.error('Data retention cleanup failed', error instanceof Error ? error : new Error(String(error)), { traceId, userId });

    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to run data retention cleanup',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        suggestion: 'Please try again later or contact support'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
