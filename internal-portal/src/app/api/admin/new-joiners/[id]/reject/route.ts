export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { notifyCleanerRejection } from '@/lib/cleaner-integrations';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { log } from '@/lib/logger';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;
  const userId = authResult.user?.id;

  const { id } = await params;
  try {
    const joinerId = parseInt(id);
    const body = await request.json() as { reason?: string };
    const { reason } = body;

    // Check if joiner exists and is pending
    const joiner = await db.prepare(
      'SELECT * FROM new_joiners WHERE id = ? AND status = ?'
    ).bind(joinerId, 'pending').first();

    if (!joiner) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Application not found or already processed',
          suggestion: 'The application may have been already approved or rejected'
        }
      }, { status: 404 });
      return withSecurityHeaders(response, traceId);
    }

    const joinerData = joiner as any;

    // Ensure rejection tracking columns exist
    await db.prepare(`ALTER TABLE new_joiners ADD COLUMN rejection_reason TEXT`).run().catch(() => {});
    await db.prepare(`ALTER TABLE new_joiners ADD COLUMN rejected_by INTEGER`).run().catch(() => {});
    await db.prepare(`ALTER TABLE new_joiners ADD COLUMN rejected_at DATETIME`).run().catch(() => {});
    await db.prepare(`ALTER TABLE new_joiners ADD COLUMN updated_at DATETIME`).run().catch(() => {});

    // Update new_joiners status
    await db.prepare(
      `UPDATE new_joiners 
       SET status = 'rejected', rejection_reason = ?, rejected_by = ?, rejected_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?`
    ).bind(reason || 'No reason provided', userId, joinerId).run();

    const notificationResult = await notifyCleanerRejection({
      traceId,
      phone: joinerData.phone,
      name: joinerData.name,
      reason,
    });

    // Log audit event
    log.audit('REJECT', 'cleaner_application', {
      traceId,
      userId,
      joinerId,
      applicantEmail: joinerData.email,
      reason
    });

    const response = NextResponse.json({
      success: true,
      message: 'Application rejected successfully',
      data: {
        joinerId,
        status: 'rejected',
        reason,
        integrations: {
          notifications: notificationResult,
        }
      }
    });
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Application rejection error:', error);
    log.error('Failed to reject application', error instanceof Error ? error : new Error(String(error)), { traceId, userId, joinerId: id });
    
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Failed to reject application: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
