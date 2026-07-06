export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { generatePromoCodeEmail } from '@/lib/email-templates';
import { getCloudflareContext } from '@/lib/runtime-context';
import { withAuth, withTracing, withSecurityHeaders, withCsrf, withRateLimit } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);

  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse) return withSecurityHeaders(rateLimitResponse, traceId);

  const csrfResult = await withCsrf(request);
  if (csrfResult) return withSecurityHeaders(csrfResult, traceId);

  const authResult = await withAuth(request, ['admin', 'staff']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);

  try {
    const { env } = await getCloudflareContext({ async: true }) as unknown as { env: any };
    const resendApiKey = (env as any)?.RESEND_API_KEY || process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return withSecurityHeaders(NextResponse.json({ error: 'Email service not configured' }, { status: 503 }), traceId);
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
      return withSecurityHeaders(NextResponse.json({
        error: 'Some emails failed to send',
        sent: results.length - failures.length,
        failed: failures.length
      }, { status: 207 }), traceId); // Multi-status
    }

    return withSecurityHeaders(NextResponse.json({
      success: true,
      sent: results.length
    }), traceId);

  } catch (error) {
    console.error('Error sending promo email:', error);
    return withSecurityHeaders(NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    ), traceId);
  }
}
