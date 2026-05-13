export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { generatePromoCodeEmail } from '@/lib/email-templates';

export async function POST(request: NextRequest) {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 503 });
    }

    const { Resend } = await import('resend');
    const resend = new Resend(resendApiKey);
    const body = await request.json() as {
      promoCode: string;
      description: string;
      discountType: 'percentage' | 'fixed';
      discountValue: number;
      validUntil: string;
      recipientEmail: string | string[];
      recipientCount?: number;
    };
    const { 
      promoCode,
      description,
      discountType,
      discountValue,
      validUntil,
      recipientEmail,
      recipientCount = 1
    } = body;

    if (!promoCode || !recipientEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://scratchsolidsolutions.org';
    const shareUrl = `${baseUrl}/services?promo=${promoCode}`;

    const html = generatePromoCodeEmail({
      promoCode,
      description: description || 'Special discount on our cleaning services',
      discountType: discountType || 'percentage',
      discountValue: discountValue || 0,
      validUntil: validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      recipientEmail: Array.isArray(recipientEmail) ? recipientEmail[0] : recipientEmail,
      shareUrl
    });

    // Send email to each recipient
    const recipients = Array.isArray(recipientEmail) ? recipientEmail : [recipientEmail];
    
    const results = await Promise.allSettled(
      recipients.map(email =>
        resend.emails.send({
          from: 'Scratch Solid Solutions <promos@scratchsolidsolutions.org>',
          to: [email],
          subject: `Exclusive Promo Code: ${promoCode}`,
          html,
        })
      )
    );

    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      console.error('Some emails failed to send:', failures);
      return NextResponse.json({ 
        error: 'Some emails failed to send',
        sent: results.length - failures.length,
        failed: failures.length
      }, { status: 207 }); // Multi-status
    }

    return NextResponse.json({ 
      success: true,
      sent: results.length
    });

  } catch (error) {
    console.error('Error sending promo email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
