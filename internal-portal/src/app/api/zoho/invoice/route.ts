export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders, logRequest } from '@/lib/middleware';
import { createInvoice, findCustomerByEmail, createCustomer } from '@/lib/zoho';

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const start = Date.now();
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);

  try {
    const { customer_email, customer_name, customer_phone, amount, reference, notes } = await request.json() as {
      customer_email?: string;
      customer_name?: string;
      customer_phone?: string;
      amount?: number;
      reference?: string;
      notes?: string;
    };

    if (!customer_email || !amount) {
      const response = NextResponse.json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Missing required fields', details: { required: ['customer_email', 'amount'] } }
      }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    let customer = await findCustomerByEmail(customer_email);
    let customerId: string;
    if (customer) {
      customerId = customer.contact_id;
    } else {
      const created = await createCustomer(customer_name || customer_email, customer_email, customer_phone || '');
      customerId = created.contact?.contact_id;
      if (!customerId) {
        throw new Error('Failed to create or find Zoho customer');
      }
    }

    const invoice = await createInvoice(customerId, [
      { item_id: 'default_service', rate: amount, quantity: 1 }
    ], { reference, notes, date: new Date().toISOString().split('T')[0] });

    const response = NextResponse.json({
      success: true,
      data: invoice
    }, { status: 201 });
    logRequest(request, response, Date.now() - start, traceId);
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    const response = NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create invoice', details: { error: error instanceof Error ? error.message : 'Unknown error' } }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
