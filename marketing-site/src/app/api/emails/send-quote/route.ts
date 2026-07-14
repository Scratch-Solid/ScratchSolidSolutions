export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { generateQuoteConfirmationEmail } from '@/lib/email-templates';
import { getCloudflareContext } from '@/lib/runtime-context';
import { withRateLimit } from '@/lib/middleware';

// Sends the confirmation email for a quote that actually exists, using the
// values stored in quote_requests rather than trusting the request body -
// this endpoint has no auth (it's called right after a public quote is
// created), so without this it would be an open relay: any caller could
// have it send arbitrary content to an arbitrary address from our domain.
export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = await withRateLimit(request, { windowMs: 60000, maxRequests: 10 });
    if (rateLimitResult && !rateLimitResult.success) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const { env } = await getCloudflareContext({ async: true }) as unknown as { env: any };
    const resendApiKey = (env as any)?.RESEND_API_KEY || process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 503 });
    }

    const body = await request.json() as { refNumber?: string };
    const { refNumber } = body;
    if (!refNumber) {
      return NextResponse.json({ error: 'refNumber is required' }, { status: 400 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const quote = await db.prepare(
      `SELECT ref_number, name, email, service_name, baseline_price, discount_amount, final_price, promo_code FROM quote_requests WHERE ref_number = ?`
    ).bind(refNumber).first() as {
      ref_number: string;
      name: string;
      email: string;
      service_name: string;
      baseline_price: number;
      discount_amount: number;
      final_price: number;
      promo_code: string | null;
    } | null;

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    const { Resend } = await import('resend');
    const resend = new Resend(resendApiKey);

    const html = generateQuoteConfirmationEmail({
      refNumber: quote.ref_number,
      customerName: quote.name,
      customerEmail: quote.email,
      serviceName: quote.service_name,
      baselinePrice: quote.baseline_price || 0,
      discountAmount: quote.discount_amount || 0,
      finalPrice: quote.final_price || 0,
      promoCode: quote.promo_code || undefined,
      validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    });

    const { data, error } = await resend.emails.send({
      from: 'Scratch Solid Solutions <quotes@scratchsolidsolutions.org>',
      to: [quote.email],
      subject: `Your Quote from Scratch Solid Solutions - Ref: ${quote.ref_number}`,
      html,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      messageId: data?.id 
    });

  } catch (error) {
    console.error('Error sending quote email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
