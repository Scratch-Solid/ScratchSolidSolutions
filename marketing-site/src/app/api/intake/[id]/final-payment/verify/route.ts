export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { withTracing, withSecurityHeaders } from '@/lib/middleware';
import { getDb, getIntakeRequest } from '@/lib/db';
import { verifyTransaction } from '@/lib/paystack';
import { sendDigitalFinalPaymentConfirmationEmail } from '@/lib/email';

// GET /api/intake/[id]/final-payment/verify — public, same fast-path pattern
// as the deposit verify route. The webhook (api/webhooks/paystack/route.ts)
// independently confirms the same event; Paystack's own verify-transaction
// call is the real trust boundary, not this route's own auth.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);

  try {
    const db = await getDb();
    if (!db) return withSecurityHeaders(NextResponse.json({ error: 'Database not available' }, { status: 500 }), traceId);

    const { id } = await params;
    const intakeId = Number(id);
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');
    if (!reference) {
      return withSecurityHeaders(NextResponse.json({ error: 'reference is required' }, { status: 400 }), traceId);
    }

    const payment = await db.prepare(
      `SELECT * FROM payments WHERE external_payment_id = ? AND project_intake_id = ? AND payment_purpose = 'digital_final'`
    ).bind(reference, intakeId).first() as any;
    if (!payment) {
      return withSecurityHeaders(NextResponse.json({ error: 'Payment not found' }, { status: 404 }), traceId);
    }

    if (payment.status === 'completed') {
      return withSecurityHeaders(NextResponse.json({ status: 'success', message: 'Final payment already confirmed' }), traceId);
    }

    const verifyResult = await verifyTransaction(reference);
    if (!verifyResult.status || !verifyResult.data || verifyResult.data.status !== 'success') {
      return withSecurityHeaders(NextResponse.json({
        status: 'failed',
        message: verifyResult.data?.status ? `Payment ${verifyResult.data.status}` : (verifyResult.message || 'Payment not successful'),
      }), traceId);
    }

    if (verifyResult.data.domain === 'test') {
      logger.error('Paystack digital-final-payment transaction verified in TEST mode - no real funds moved', new Error(`reference=${reference}`));
    }

    const metadata = payment.metadata ? JSON.parse(payment.metadata) : {};
    metadata.paystack_event = 'verify.success';
    metadata.paid_at = verifyResult.data.paid_at;
    metadata.channel = verifyResult.data.channel;
    metadata.domain = verifyResult.data.domain;

    await db.prepare(
      `UPDATE payments SET status = 'completed', payment_date = datetime('now'), metadata = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(JSON.stringify(metadata), payment.id).run();

    await db.prepare(
      `UPDATE project_intake_requests SET final_paid_at = datetime('now'), final_payment_ref = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(reference, intakeId).run();

    const intake = await getIntakeRequest(db, intakeId) as Record<string, any> | null;
    if (intake) {
      const clientName = intake.name || intake.company_name || 'there';
      try {
        await sendDigitalFinalPaymentConfirmationEmail(intake.email, clientName, payment.amount, reference);
      } catch (emailError) {
        logger.error('Failed to send digital final payment confirmation email', emailError as Error);
      }
    }

    return withSecurityHeaders(NextResponse.json({ status: 'success', message: 'Final payment confirmed. Thank you!' }), traceId);
  } catch (error) {
    logger.error('Digital final payment verify error', error as Error);
    return withSecurityHeaders(
      NextResponse.json({ error: `Payment verification failed: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 }),
      traceId
    );
  }
}
