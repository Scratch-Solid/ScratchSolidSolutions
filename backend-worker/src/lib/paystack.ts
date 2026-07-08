/**
 * Paystack Integration Module for backend-worker
 * Handles payment initialization, verification, and webhook processing
 */

interface PaystackConfig {
  secretKey: string;
  publicKey: string;
}

function getConfig(env: any): PaystackConfig {
  const secretKey = env.PAYSTACK_SECRET_KEY;
  const publicKey = env.PAYSTACK_PUBLIC_KEY;
  if (!secretKey) {
    throw new Error('PAYSTACK_SECRET_KEY not configured');
  }
  return { secretKey, publicKey: publicKey || '' };
}

/**
 * Initialize a Paystack transaction
 */
export async function initializeTransaction(
  env: any,
  params: {
    email: string;
    amount: number; // in kobo (ZAR cents)
    reference: string;
    callback_url?: string;
    metadata?: Record<string, any>;
  }
): Promise<{
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}> {
  const { secretKey } = getConfig(env);

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

/**
 * Verify a Paystack transaction
 */
export async function verifyTransaction(
  env: any,
  reference: string
): Promise<{
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
    customer: {
      email: string;
    };
    authorization: {
      authorization_code: string;
      card_type: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      bank: string;
      country_code: string;
      reusable: boolean;
    };
  };
}> {
  const { secretKey } = getConfig(env);

  const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
  });

  return response.json();
}

/**
 * Process Paystack webhook event
 * Returns structured event data for handling
 */
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
  // For charge.success, reference is at data.reference
  // For refund.processed, reference is at data.transaction.reference
  const reference = data.reference || data.transaction?.reference || null;
  const amount = data.amount || null;
  const email = data.customer?.email || null;
  const metadata = data.metadata || null;

  return {
    event,
    data,
    isChargeSuccess,
    reference,
    amount,
    email,
    metadata,
  };
}

/**
 * Verify Paystack webhook signature using Web Crypto API (Cloudflare Workers compatible)
 */
export async function verifyWebhookSignature(
  secretKey: string,
  signature: string,
  body: string
): Promise<boolean> {
  // Paystack uses HMAC-SHA512
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

/**
 * Refund a Paystack transaction (full or partial)
 * https://api.paystack.co/refund
 */
export async function refundTransaction(
  env: any,
  params: {
    reference: string;
    amount?: number; // in kobo; omit for full refund
    reason?: string;
  }
): Promise<{
  status: boolean;
  message: string;
  data?: {
    transaction: { id: number; reference: string };
    integration: number;
    domain: string;
    currency: string;
    amount: number;
    channel: string;
    fully_deducted: boolean;
    refunded_by: string;
    refunded_at: string;
    expected_at: string;
    settlement: { id: number; status: string };
  };
}> {
  const { secretKey } = getConfig(env);

  const body: Record<string, any> = {
    transaction: params.reference,
  };
  if (params.amount) body.amount = params.amount;
  if (params.reason) body.merchant_note = params.reason;

  const response = await fetch('https://api.paystack.co/refund', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  return response.json();
}

/**
 * List all refunds for a transaction (for reconciliation)
 */
export async function listRefunds(
  env: any,
  reference: string
): Promise<{
  status: boolean;
  message: string;
  data?: Array<{
    integration: number;
    transaction: number;
    amount: number;
    currency: string;
    customer: { id: number; email: string };
    status: string;
    domain: string;
  }>;
}> {
  const { secretKey } = getConfig(env);

  const response = await fetch(
    `https://api.paystack.co/refund?transaction=${encodeURIComponent(reference)}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.json();
}

/**
 * Generate a unique Paystack reference for a booking
 */
export function generatePaystackReference(bookingId: string | number): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SSS-${bookingId}-${timestamp}-${random}`;
}
