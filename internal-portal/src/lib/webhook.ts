import crypto from 'crypto';

// Webhook Security Implementation
// Provides signature verification, IP allowlisting, and replay attack prevention

export interface WebhookConfig {
  secret: string;
  algorithm: string;
  toleranceSeconds: number;
  allowedIps: string[];
}

export interface WebhookVerificationResult {
  valid: boolean;
  error?: string;
  timestamp?: number;
}

// Default configuration
const defaultConfig: WebhookConfig = {
  secret: process.env.WEBHOOK_SECRET || '',
  algorithm: 'sha256',
  toleranceSeconds: 300, // 5 minutes
  allowedIps: (process.env.WEBHOOK_ALLOWED_IPS || '').split(',').filter(ip => ip.trim())
};

/**
 * Verify webhook signature
 * @param payload - Raw request body as string
 * @param signature - Signature from X-Signature header
 * @param timestamp - Timestamp from X-Timestamp header
 * @param config - Webhook configuration
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  timestamp?: string,
  config: WebhookConfig = defaultConfig
): WebhookVerificationResult {
  if (!config.secret) {
    return { valid: false, error: 'Webhook secret not configured' };
  }

  if (!signature) {
    return { valid: false, error: 'Signature missing' };
  }

  // Check timestamp for replay attack prevention
  if (timestamp) {
    const webhookTime = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    
    if (isNaN(webhookTime)) {
      return { valid: false, error: 'Invalid timestamp format' };
    }
    
    if (Math.abs(now - webhookTime) > config.toleranceSeconds) {
      return { valid: false, error: 'Timestamp too old or future' };
    }
  }

  // Verify signature
  const expectedSignature = crypto
    .createHmac(config.algorithm, config.secret)
    .update(payload)
    .digest('hex');

  // Use constant-time comparison to prevent timing attacks
  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );

  if (!isValid) {
    return { valid: false, error: 'Invalid signature' };
  }

  return {
    valid: true,
    timestamp: timestamp ? parseInt(timestamp, 10) : undefined
  };
}

/**
 * Check if IP is in allowlist
 * @param ip - IP address to check
 * @param config - Webhook configuration
 */
export function isIpAllowed(ip: string, config: WebhookConfig = defaultConfig): boolean {
  if (config.allowedIps.length === 0) {
    // If no IPs are specified, allow all (not recommended for production)
    return true;
  }

  return config.allowedIps.includes(ip);
}

/**
 * Generate signature for webhook payload (for testing)
 * @param payload - Payload to sign
 * @param secret - Webhook secret
 * @param timestamp - Optional timestamp
 */
export function generateWebhookSignature(
  payload: string,
  secret: string,
  timestamp?: string
): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  return hmac.digest('hex');
}

/**
 * Middleware to verify webhook requests
 * @param request - NextRequest object
 * @param config - Webhook configuration
 */
export async function verifyWebhookRequest(
  request: Request,
  config: WebhookConfig = defaultConfig
): Promise<WebhookVerificationResult> {
  const signature = request.headers.get('X-Signature') || request.headers.get('x-signature');
  const timestamp = request.headers.get('X-Timestamp') || request.headers.get('x-timestamp');
  const payload = await request.text();

  // Verify signature
  const signatureResult = verifyWebhookSignature(payload, signature || '', timestamp, config);
  if (!signatureResult.valid) {
    return signatureResult;
  }

  // Check IP if available
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
             request.headers.get('x-real-ip') || '';
  
  if (ip && !isIpAllowed(ip, config)) {
    return { valid: false, error: 'IP not in allowlist' };
  }

  return signatureResult;
}

/**
 * Replay attack detection using nonce storage
 * In production, this should use a database or KV store
 */
const usedNonces = new Set<string>();
const NONCE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Check and record nonce to prevent replay attacks
 * @param nonce - Unique nonce from request
 */
export function checkAndRecordNonce(nonce: string): boolean {
  if (usedNonces.has(nonce)) {
    return false; // Replay attack detected
  }

  usedNonces.add(nonce);

  // Clean up old nonces
  setTimeout(() => {
    usedNonces.delete(nonce);
  }, NONCE_EXPIRY_MS);

  return true;
}

/**
 * Validate webhook request with all security checks
 * @param request - NextRequest object
 * @param config - Webhook configuration
 */
export async function validateWebhookRequest(
  request: Request,
  config: WebhookConfig = defaultConfig
): Promise<{ valid: boolean; error?: string; payload?: string }> {
  // Verify signature and IP
  const verification = await verifyWebhookRequest(request, config);
  if (!verification.valid) {
    return { valid: false, error: verification.error };
  }

  // Check nonce if provided
  const nonce = request.headers.get('X-Nonce') || request.headers.get('x-nonce');
  if (nonce && !checkAndRecordNonce(nonce)) {
    return { valid: false, error: 'Replay attack detected' };
  }

  // Get payload
  const payload = await request.text();

  return { valid: true, payload };
}

// Webhook provider configurations
export const webhookProviders = {
  zoho: {
    secret: process.env.ZOHO_WEBHOOK_SECRET || '',
    allowedIps: (process.env.ZOHO_WEBHOOK_IPS || '').split(',').filter(ip => ip.trim())
  },
  sendgrid: {
    secret: process.env.SENDGRID_WEBHOOK_SECRET || '',
    allowedIps: (process.env.SENDGRID_WEBHOOK_IPS || '').split(',').filter(ip => ip.trim())
  }
};
