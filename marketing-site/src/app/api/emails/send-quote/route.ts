export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { generateQuoteConfirmationEmail } from '@/lib/email-templates';

export async function POST(request: NextRequest) {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 503 });
    }

    const { Resend } = await import('resend');
    const resend = new Resend(resendApiKey);
    const body = await request.json() as {
      refNumber: string;
      customerName: string;
      customerEmail: string;
      serviceName: string;
      baselinePrice: number;
      discountAmount: number;
      finalPrice: number;
      promoCode?: string;
      validUntil?: string;
    };
    const { 
      refNumber,
      customerName,
      customerEmail,
      serviceName,
      baselinePrice,
      discountAmount,
      finalPrice,
      promoCode,
      validUntil
    } = body;

    if (!refNumber || !customerName || !customerEmail || !serviceName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const html = generateQuoteConfirmationEmail({
      refNumber,
      customerName,
      customerEmail,
      serviceName,
      baselinePrice: baselinePrice || 0,
      discountAmount: discountAmount || 0,
      finalPrice: finalPrice || 0,
      promoCode,
      validUntil: validUntil || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    });

    const { data, error } = await resend.emails.send({
      from: 'Scratch Solid Solutions <quotes@scratchsolidsolutions.org>',
      to: [customerEmail],
      subject: `Your Quote from Scratch Solid Solutions - Ref: ${refNumber}`,
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
