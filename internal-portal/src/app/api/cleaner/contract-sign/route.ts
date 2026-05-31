export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { log } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['cleaner']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;
  const userId = authResult.user?.id;

  try {
    const body = await request.json() as { signature_id?: string };
    const { signature_id } = body;

    if (!signature_id) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Signature ID is required',
          suggestion: 'Please provide the DocuSign signature ID'
        }
      }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

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

    // Update training progress
    await db.prepare(
      `UPDATE training_progress 
       SET contract_signed = 1, contract_signed_at = datetime('now'), contract_signature_id = ?, updated_at = datetime('now')
       WHERE employee_id = ?`
    ).bind(signature_id, cleaner.paysheet_code).run();

    // Log audit event
    log.audit('CONTRACT_SIGNED', 'cleaner', {
      traceId,
      userId,
      paysheetCode: cleaner.paysheet_code,
      signatureId: signature_id
    });

    const response = NextResponse.json({
      success: true,
      message: 'Contract signed successfully',
      data: {
        next_step: 'training'
      }
    });
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Contract signing error:', error);
    log.error('Failed to sign contract', error instanceof Error ? error : new Error(String(error)), { traceId, userId });
    
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to sign contract',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
