export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createOnboardingSignatureReference, notifyCleanerContract } from '@/lib/cleaner-integrations';
import { setCleanerOnboardingStage } from '@/lib/cleaner-training';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { log } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['cleaner']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;
  const userId = authResult.user?.id;

  try {
    await request.json().catch(() => ({}));

    // Get cleaner profile + user email
    const cleanerProfile = await db.prepare(
      'SELECT cp.paysheet_code, cp.first_name, cp.last_name, cp.cellphone, u.email FROM cleaner_profiles cp JOIN users u ON cp.user_id = u.id WHERE cp.user_id = ?'
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
    const cleanerName = `${cleaner.first_name || ''} ${cleaner.last_name || ''}`.trim() || cleaner.paysheet_code;
    const { signatureId, signingUrl, integration } = await createOnboardingSignatureReference(traceId, 'contract', {
      cleanerEmail: cleaner.email || '',
      cleanerName,
      returnUrl: 'https://portal.scratchsolidsolutions.org/onboarding/contract-complete',
    });

    // Update training progress
    await db.prepare(
      `UPDATE training_progress 
       SET contract_signed = 1, contract_signed_at = datetime('now'), contract_signature_id = ?, updated_at = datetime('now')
       WHERE employee_id = ?`
    ).bind(signatureId, cleaner.paysheet_code).run();
    await setCleanerOnboardingStage(db, Number(userId), 'contract_signed');

    // Persist consent record for POPIA compliance and retrievability
    await db.prepare(
      `INSERT INTO consent_records (user_id, consent_type, consent_given, consent_date, ip_address, user_agent, created_at)
       VALUES (?, ?, 1, datetime('now'), ?, ?, datetime('now'))`
    ).bind(
      userId,
      'employment_contract',
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent')?.slice(0, 200) || 'unknown'
    ).run();

    // Log stage transition in onboarding_audit
    await db.prepare(
      `INSERT INTO onboarding_audit (user_id, from_stage, to_stage, event_type, metadata, ip_address, user_agent, created_at)
       VALUES (?, 'consent_approved', 'contract_signed', 'stage_transition', ?, ?, ?, datetime('now'))`
    ).bind(
      userId,
      JSON.stringify({ signature_id: signatureId, source: 'contract-sign' }),
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent')?.slice(0, 200) || 'unknown'
    ).run();

    const notificationResult = await notifyCleanerContract({
      traceId,
      phone: cleaner.cellphone || '',
      name: `${cleaner.first_name || ''} ${cleaner.last_name || ''}`.trim() || cleaner.paysheet_code,
    });

    // Log audit event
    log.audit('CONTRACT_SIGNED', 'cleaner', {
      traceId,
      userId,
      paysheetCode: cleaner.paysheet_code,
      signatureId
    });

    const responseData: Record<string, any> = {
      signature_id: signatureId,
      integration,
      notifications: notificationResult,
      next_step: 'training',
    };

    if (signingUrl) {
      responseData.signing_url = signingUrl;
      responseData.redirect_to_docusign = true;
    }

    const response = NextResponse.json({
      success: true,
      message: signingUrl ? 'Contract sent via DocuSign. Please complete signing.' : 'Contract signed successfully',
      data: responseData
    });
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Contract signing error:', error);
    log.error('Failed to sign contract', error instanceof Error ? error : new Error(String(error)), { traceId, userId });
    
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Failed to sign contract: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
