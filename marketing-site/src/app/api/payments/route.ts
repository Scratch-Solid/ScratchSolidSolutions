import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUserById } from "@/lib/db";
import { logger } from "@/lib/logger";
import { validateString, validateNumber } from "@/lib/validation";
import { withRateLimit, rateLimits } from "@/lib/rateLimit";
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { createInvoice, recordPayment } from '@/lib/zoho';
import { sendPaymentReceiptEmail } from '@/lib/email';

export const dynamic = "force-dynamic";

// Zoho Books integration - actual API calls
async function createZohoInvoice(paymentData: any) {
  try {
    // Create customer in Zoho if not exists (using user_id as customer ID)
    const customerId = `CUST-${paymentData.user_id}`;
    
    // Create line item for the cleaning service
    const lineItems = [{
      item_id: 'cleaning-service',
      name: 'Cleaning Service',
      description: `Booking #${paymentData.booking_id}`,
      quantity: 1,
      rate: paymentData.amount,
    }];

    // Create invoice in Zoho Books
    const invoiceResponse = await createInvoice(customerId, lineItems) as any;

    if (invoiceResponse.code === 0 && invoiceResponse.invoice) {
      const invoiceId = invoiceResponse.invoice.invoice_id;
      
      // Record payment based on payment method
      const paymentMode = paymentData.payment_method === 'cash' ? 'cash' : 'eft';
      await recordPayment(invoiceId, paymentData.amount, paymentMode, new Date().toISOString().split('T')[0]);
      
      return { invoice_id: invoiceId };
    }
    
    throw new Error('Failed to create Zoho invoice');
  } catch (error) {
    logger.error('Zoho Books integration error', error as Error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['client', 'business']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  // Rate limiting check
  const rateLimitResult = await withRateLimit(request, rateLimits.strict);
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(
      NextResponse.json(
        { error: 'Too many payment requests. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString()
          }
        }
      ),
      traceId
    );
  }

  try {
    const body = await request.json() as {
      booking_id?: number;
      payment_method?: string;
      amount?: number;
    };
    const { booking_id, payment_method, amount } = body;
    const user_id: number = (user as any).id;

    // Validate required fields
    const bookingIdValidation = validateNumber(booking_id, 'booking_id');
    if (!bookingIdValidation.valid) {
      return NextResponse.json({ error: bookingIdValidation.errors.join(', ') }, { status: 400 });
    }

    const paymentMethodValidation = validateString(payment_method, 'payment_method');
    if (!paymentMethodValidation.valid) {
      return NextResponse.json({ error: paymentMethodValidation.errors.join(', ') }, { status: 400 });
    }

    const amountValidation = validateNumber(amount, 'amount', 0);
    if (!amountValidation.valid) {
      return NextResponse.json({ error: amountValidation.errors.join(', ') }, { status: 400 });
    }

    if (!booking_id || !payment_method || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Process payment
    const result = await db.prepare(
      `INSERT INTO payments (user_id, booking_id, amount, method, status, created_at)
       VALUES (?, ?, ?, ?, 'confirmed', datetime('now')) RETURNING *`
    ).bind(user_id, booking_id, amount, payment_method).first();

    if (!result) {
      return NextResponse.json({ error: 'Payment creation failed' }, { status: 500 });
    }

    // Trigger Zoho Books integration
    try {
      const zohoInvoice = await createZohoInvoice({
        payment_id: (result as any).id,
        booking_id,
        amount,
        payment_method,
        user_id,
      });

      // Update payment record with Zoho invoice ID
      await db.prepare(
        `UPDATE payments SET zoho_invoice_id = ? WHERE id = ?`
      ).bind(zohoInvoice.invoice_id, (result as any).id).run();
    } catch (zohoError) {
      logger.error('Zoho Books integration failed', zohoError as Error);
      // Mark payment as pending Zoho sync
      await db.prepare(
        `UPDATE payments SET status = 'pending_zoho_sync' WHERE id = ?`
      ).bind((result as any).id).run();
    }

    // Send payment receipt email
    try {
      const user = await getUserById(db, user_id);
      if (user && (user as any).email) {
        await sendPaymentReceiptEmail(
          (user as any).email,
          (user as any).name || 'Customer',
          amount,
          new Date().toISOString().split('T')[0],
          booking_id
        );
      }
    } catch (emailError) {
      logger.error('Failed to send payment receipt email', emailError as Error);
    }

    const response = NextResponse.json({
      ...result,
      message: 'Payment confirmed successfully'
    }, { status: 201 });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error creating payment', error as Error);
    const response = NextResponse.json({ 
      error: 'Payment processing failed',
      message: 'Please retry or contact admin'
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
