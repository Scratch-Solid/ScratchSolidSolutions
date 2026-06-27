import { getCloudflareContext } from './runtime-context';

/** Read CSRF_SECRET from Cloudflare Worker env (wrangler secret) with process.env fallback. */
async function getCsrfSecret(): Promise<string> {
  let secret: string | undefined;
  try {
    const { env } = await getCloudflareContext({ async: true }) as unknown as { env: any };
    secret = (env as any)?.CSRF_SECRET || process.env.CSRF_SECRET;
  } catch {
    secret = process.env.CSRF_SECRET;
  }
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CSRF_SECRET environment variable is required in production');
    }
    return 'dev-secret-fallback-do-not-use-in-production';
  }
  return secret;
}

/** Convert ArrayBuffer to hex string. */
function arrayBufferToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Constant-time hex string comparison. */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/** Sign data with HMAC-SHA256 using Web Crypto API. */
async function hmacSign(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
  return arrayBufferToHex(signature);
}

export async function generateCsrfToken(): Promise<string> {
  // 32 random bytes = 64 hex characters
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const token = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const secret = await getCsrfSecret();
  const hash = await hmacSign(secret, token);
  return `${token}.${hash}`;
}

export async function validateCsrfToken(token: string): Promise<boolean> {
  try {
    const dotIndex = token.lastIndexOf('.');
    if (dotIndex === -1) return false;
    const payload = token.slice(0, dotIndex);
    const hash = token.slice(dotIndex + 1);
    if (!payload || !hash) return false;
    const secret = await getCsrfSecret();
    const expected = await hmacSign(secret, payload);
    if (expected.length !== hash.length) return false;
    return timingSafeEqualHex(expected, hash);
  } catch {
    return false;
  }
}
