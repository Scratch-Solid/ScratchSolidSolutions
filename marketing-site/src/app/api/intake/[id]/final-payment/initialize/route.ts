export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { withRateLimit, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { getDb, getIntakeRequest } from '@/lib/db';
import { initializeTransaction, generatePaystackReference } from '@/lib/paystack';
import { computeDigitalPriceBreakdown, type PageListItem } from '@/lib/digital-pricing';

// POST /api/intake/[id]/final-payment/initialize — public, unauthenticated,
// same trust model as the deposit route. Only reachable once the deposit
// has actually been paid - the final balance can't be collected on a
// project that was never confirmed. The amount is always recomputed from
// the intake's own stored pricing, never accepted from the request body.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);

  const rateLimitResult = await withRateLimit(request, { windowMs: 3600000, maxRequests: 10 });
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 }), traceId);
  }

  try {
    const db = await getDb();
    if (!db) return withSecurityHeaders(NextResponse.json({ error: 'Database not available' }, { status: 500 }), traceId);

    const { id } = await params;
    const intakeId = Number(id);
    const intake = await getIntakeRequest(db, intakeId) as Record<string, any> | null;
    if (!intake) {
      return withSecurityHeaders(NextResponse.json({ error: 'Intake request not found' }, { status: 404 }), traceId);
    }
    if (!intake.deposit_paid_at) {
      return withSecurityHeaders(NextResponse.json({ error: 'The deposit for this project has not been paid yet' }, { status: 400 }), traceId);
    }
    if (intake.final_paid_at) {
      return withSecurityHeaders(NextResponse.json({ error: 'The final payment for this project has already been paid' }, { status: 400 }), traceId);
    }

    const body = await request.json().catch(() => ({})) as { callback_url?: string };

    const pageList: PageListItem[] = intake.page_list ? JSON.parse(intake.page_list) : [];
    const breakdown = await computeDigitalPriceBreakdown(db, {
      pageList,
      promoCode: intake.promo_code,
      supportTier: intake.support_tier,
    });

    if (!breakdown.finalAmount || breakdown.finalAmount <= 0) {
      return withSecurityHeaders(NextResponse.json({ error: 'Unable to determine a final payment amount for this project' }, { status: 400 }), traceId);
    }

    const existingPayment = await db.prepare(
      `SELECT * FROM payments WHERE project_intake_id = ? AND payment_purpose = 'digital_final' AND status IN ('pending', 'processing')`
    ).bind(intakeId).first();
    if (existingPayment) {
      return withSecurityHeaders(NextResponse.json({
        message: 'Final payment already initiated',
        reference: (existingPayment as any).external_payment_id,
        authorization_url: null,
      }), traceId);
    }

    const reference = generatePaystackReference(`intake-${intakeId}-final`);

    const initResult = await initializeTransaction({
      email: intake.email,
      amount: Math.round(breakdown.finalAmount * 100), // ZAR to kobo
      reference,
      callback_url: body.callback_url,
      metadata: {
        project_intake_id: String(intakeId),
        payment_purpose: 'digital_final',
        total_price: String(breakdown.totalPrice),
      },
    });

    if (!initResult.status || !initResult.data) {
      logger.error('Paystack initialization rejected (digital final payment)', new Error(initResult.message || 'unknown'));
      return withSecurityHeaders(
        NextResponse.json({ error: 'Payment initialization failed', detail: initResult.message }, { status: 502 }),
        traceId
      );
    }

    await db.prepare(`
      INSERT INTO payments (project_intake_id, payment_purpose, amount, status, external_payment_id, gateway, metadata, created_at)
      VALUES (?, 'digital_final', ?, 'pending', ?, 'paystack', ?, datetime('now'))
    `).bind(
      intakeId,
      breakdown.finalAmount,
      reference,
      JSON.stringify({ authorization_url: initResult.data.authorization_url, email: intake.email, currency: 'ZAR' })
    ).run();

    const response = NextResponse.json({
      status: 'pending',
      reference: initResult.data.reference,
      authorization_url: initResult.data.authorization_url,
      access_code: initResult.data.access_code,
      amount: breakdown.finalAmount,
    });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Digital final payment initialize error', error as Error);
    return withSecurityHeaders(
      NextResponse.json({ error: `Payment initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 }),
      traceId
    );
  }
}
