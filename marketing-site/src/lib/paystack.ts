/**
 * Paystack integration for marketing-site.
 *
 * Previously this app proxied payment initialize/verify calls to
 * backend-worker, which looked up bookings in its own, entirely separate D1
 * database (scratchsolid-backend-db) - a database with zero rows in its
 * bookings table in both staging and production, since every real booking is
 * created here, in marketing-site's own database. That meant every card
 * payment attempt failed with "Booking not found" - card payments have never
 * worked for a single real customer. This module and the routes that use it
 * implement Paystack directly against this app's own, real bookings/payments
 * tables instead of round-tripping through a disconnected database.
 */

async function getPaystackSecretKey(): Promise<string> {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new Error('PAYSTACK_SECRET_KEY not configured');
  }
  return key;
}

export async function initializeTransaction(params: {
  email: string;
  amount: number; // in kobo (ZAR cents)
  reference: string;
  callback_url?: string;
  metadata?: Record<string, any>;
}): Promise<{
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}> {
  const secretKey = await getPaystackSecretKey();

  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: params.email,
      amount: params.amount,
      reference: params.reference,
      callback_url: params.callback_url,
      metadata: params.metadata,
      currency: 'ZAR',
    }),
  });

  return response.json();
}

export async function verifyTransaction(reference: string): Promise<{
  status: boolean;
  message: string;
  data?: {
    status: string;
    reference: string;
    amount: number;
    paid_at: string;
    channel: string;
    currency: string;
    metadata: Record<string, any>;
    customer: { email: string };
  };
}> {
  const secretKey = await getPaystackSecretKey();

  const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
  });

  return response.json();
}

export function processWebhookEvent(body: any): {
  event: string;
  data: any;
  isChargeSuccess: boolean;
  reference: string | null;
  amount: number | null;
  email: string | null;
  metadata: Record<string, any> | null;
} {
  const event = body.event || '';
  const data = body.data || {};

  const isChargeSuccess = event === 'charge.success';
  const reference = data.reference || data.transaction?.reference || null;
  const amount = data.amount || null;
  const email = data.customer?.email || null;
  const metadata = data.metadata || null;

  return { event, data, isChargeSuccess, reference, amount, email, metadata };
}

/** Verify Paystack webhook signature (HMAC-SHA512) using Web Crypto (Workers-compatible). */
export async function verifyWebhookSignature(secretKey: string, signature: string, body: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secretKey),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex === signature;
}

export function generatePaystackReference(bookingId: string | number): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SSS-${bookingId}-${timestamp}-${random}`;
}
