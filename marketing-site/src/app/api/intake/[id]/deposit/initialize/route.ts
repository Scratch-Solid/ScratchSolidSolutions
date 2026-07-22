export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { withRateLimit, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { getDb, getIntakeRequest } from '@/lib/db';
import { initializeTransaction, generatePaystackReference } from '@/lib/paystack';
import { computeDigitalPriceBreakdown, type PageListItem } from '@/lib/digital-pricing';

// POST /api/intake/[id]/deposit/initialize — public, unauthenticated (the
// whole intake flow has no login - guests fill out the wizard by email
// only). The amount charged is always recomputed here from the intake's
// own stored page_list/promo_code/support_tier, never accepted from the
// request body - same principle as the booking Paystack fix.
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
    if (intake.deposit_paid_at) {
      return withSecurityHeaders(NextResponse.json({ error: 'The deposit for this project has already been paid' }, { status: 400 }), traceId);
    }

    const body = await request.json().catch(() => ({})) as { callback_url?: string };

    const pageList: PageListItem[] = intake.page_list ? JSON.parse(intake.page_list) : [];
    const breakdown = await computeDigitalPriceBreakdown(db, {
      pageList,
      promoCode: intake.promo_code,
      supportTier: intake.support_tier,
    });

    if (breakdown.hasCustomItems) {
      return withSecurityHeaders(
        NextResponse.json({ error: 'This project includes a custom feature that needs a quick review from our team before you can pay a deposit. We\'ll be in touch by email shortly.' }, { status: 400 }),
        traceId
      );
    }
    if (!breakdown.depositAmount || breakdown.depositAmount <= 0) {
      return withSecurityHeaders(NextResponse.json({ error: 'Unable to determine a deposit amount for this project' }, { status: 400 }), traceId);
    }

    const existingPayment = await db.prepare(
      `SELECT * FROM payments WHERE project_intake_id = ? AND payment_purpose = 'digital_deposit' AND status IN ('pending', 'processing')`
    ).bind(intakeId).first();
    if (existingPayment) {
      return withSecurityHeaders(NextResponse.json({
        message: 'Deposit payment already initiated',
        reference: (existingPayment as any).external_payment_id,
        authorization_url: null,
      }), traceId);
    }

    const reference = generatePaystackReference(`intake-${intakeId}-deposit`);

    const initResult = await initializeTransaction({
      email: intake.email,
      amount: Math.round(breakdown.depositAmount * 100), // ZAR to kobo
      reference,
      callback_url: body.callback_url,
      metadata: {
        project_intake_id: String(intakeId),
        payment_purpose: 'digital_deposit',
        total_price: String(breakdown.totalPrice),
      },
    });

    if (!initResult.status || !initResult.data) {
      logger.error('Paystack initialization rejected (digital deposit)', new Error(initResult.message || 'unknown'));
      return withSecurityHeaders(
        NextResponse.json({ error: 'Payment initialization failed', detail: initResult.message }, { status: 502 }),
        traceId
      );
    }

    await db.prepare(`
      INSERT INTO payments (project_intake_id, payment_purpose, amount, status, external_payment_id, gateway, metadata, created_at)
      VALUES (?, 'digital_deposit', ?, 'pending', ?, 'paystack', ?, datetime('now'))
    `).bind(
      intakeId,
      breakdown.depositAmount,
      reference,
      JSON.stringify({ authorization_url: initResult.data.authorization_url, email: intake.email, currency: 'ZAR' })
    ).run();

    const response = NextResponse.json({
      status: 'pending',
      reference: initResult.data.reference,
      authorization_url: initResult.data.authorization_url,
      access_code: initResult.data.access_code,
      amount: breakdown.depositAmount,
    });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Digital deposit initialize error', error as Error);
    return withSecurityHeaders(
      NextResponse.json({ error: `Payment initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 }),
      traceId
    );
  }
}
