import { NextRequest, NextResponse } from 'next/server';
import { whatsappGateway } from '@/lib/whatsapp/gateway';

export async function GET(request: NextRequest) {
  // Webhook verification for Twilio
  return NextResponse.json({ status: 'ok' });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const body = formData.get('Body') as string;
    const mediaUrls = formData.getAll('MediaUrl') as string[];

    const message = {
      from: from.replace('whatsapp:', ''),
      to: to.replace('whatsapp:', ''),
      body,
      mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined
    };

    const response = await whatsappGateway.processMessage(message);

    // Return TwiML response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${response}</Message>
</Response>`;

    return new NextResponse(twiml, {
      headers: {
        'Content-Type': 'text/xml'
      }
    });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 });
  }
}
