export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withTracing, withSecurityHeaders, logRequest } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const start = Date.now();

  try {
    const { question } = await request.json();
    if (!question) {
      return NextResponse.json({ error: 'Missing question' }, { status: 400 });
    }

    // AI chatbot response - uses predefined responses for common questions
    // In production, integrate with OpenAI/Anthropic API
    const responses: Record<string, string> = {
      booking: 'To make a booking, visit our booking page and select your preferred date, time, and cleaner. You can choose once-off or recurring bookings.',
      payment: 'We accept cash and EFT payments. Payment is collected after the service is completed.',
      cancel: 'To cancel a booking, go to your dashboard and click cancel on the booking. Weekend requests can be cancelled from your business dashboard.',
      cleaner: 'Our cleaners are vetted professionals. You can view your assigned cleaner\'s profile from your dashboard.',
      pricing: 'Our pricing depends on the service type and duration. Visit our booking page for a quote.',
      contract: 'Business contracts are available for recurring services. Contact us or sign up as a business to get started.',
      weekend: 'Weekend cleaning is available for business clients. Submit a weekend request from your business dashboard.',
      contact: 'You can reach us at info@scratchsolid.com or call us during business hours.',
    };

    const lowerQuestion = question.toLowerCase();
    let answer = 'I can help with bookings, payments, cancellations, cleaner info, pricing, contracts, and weekend requests. What would you like to know?';
    for (const [key, response] of Object.entries(responses)) {
      if (lowerQuestion.includes(key)) {
        answer = response;
        break;
      }
    }

    const response = NextResponse.json({ answer });
    logRequest(request, response, Date.now() - start, traceId);
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    const response = NextResponse.json({ error: 'Failed to process chatbot request' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
