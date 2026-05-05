import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders, logRequest } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const start = Date.now();
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  const zohoAuthToken = process.env.ZOHO_AUTH_TOKEN;
  if (!zohoAuthToken) {
    const response = NextResponse.json({ error: 'Zoho integration not configured' }, { status: 503 });
    return withSecurityHeaders(response, traceId);
  }

  try {
    const { user_id, amount } = await request.json();
    if (!user_id || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    // Create invoice via Zoho Books API
    const zohoResponse = await fetch('https://books.zoho.com/api/v3/invoices', {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-authtoken ${zohoAuthToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer_id: user_id,
        line_items: [{ item_id: 'default_service', rate: amount, quantity: 1 }],
      }),
    });
    const data = await zohoResponse.json();
    const response = NextResponse.json(data, { status: zohoResponse.ok ? 201 : 502 });
    logRequest(request, response, Date.now() - start, traceId);
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    const response = NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
