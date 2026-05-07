// TOTP (Time-based One-Time Password) Implementation
// Provides 2FA support using authenticator apps (Google Authenticator, Authy, etc.)

import crypto from 'crypto';

const TOTP_PERIOD = 30; // 30-second time window
const TOTP_DIGITS = 6; // 6-digit codes
const TOTP_ALGORITHM = 'sha1';

/**
 * Generate a random secret key for TOTP
 * @returns Base32 encoded secret
 */
export function generateTOTPSecret(): string {
  const buffer = crypto.randomBytes(20); // 160 bits for Base32
  return base32Encode(buffer);
}

/**
 * Base32 encoding
 */
function base32Encode(buffer: Buffer): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result = '';
  let bits = 0;
  let value = 0;

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      bits -= 5;
      result += alphabet[(value >>> bits) & 31];
    }
  }

  if (bits > 0) {
    result += alphabet[(value << (5 - bits)) & 31];
  }

  return result;
}

/**
 * Generate TOTP code for given secret and time
 * @param secret - Base32 encoded secret
 * @param time - Current time in seconds (default: now)
 * @returns 6-digit TOTP code
 */
export function generateTOTP(secret: string, time: number = Math.floor(Date.now() / 1000)): string {
  const counter = Math.floor(time / TOTP_PERIOD);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const key = base32Decode(secret);
  const hmac = crypto.createHmac(TOTP_ALGORITHM, key);
  hmac.update(counterBuffer);
  const hmacResult = hmac.digest();

  const offset = hmacResult[hmacResult.length - 1] & 0x0f;
  const code = ((hmacResult[offset] & 0x7f) << 24 |
                (hmacResult[offset + 1] & 0xff) << 16 |
                (hmacResult[offset + 2] & 0xff) << 8 |
                (hmacResult[offset + 3] & 0xff)) % 1000000;

  return code.toString().padStart(TOTP_DIGITS, '0');
}

/**
 * Base32 decoding
 */
function base32Decode(encoded: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const lookup: { [key: string]: number } = {};
  for (let i = 0; i < alphabet.length; i++) {
    lookup[alphabet[i]] = i;
  }

  let bits = 0;
  let value = 0;
  const result: number[] = [];

  for (const char of encoded.toUpperCase()) {
    if (lookup[char] === undefined) continue;
    value = (value << 5) | lookup[char];
    bits += 5;

    if (bits >= 8) {
      bits -= 8;
      result.push((value >>> bits) & 0xff);
    }
  }

  return Buffer.from(result);
}

/**
 * Verify TOTP code
 * @param secret - Base32 encoded secret
 * @param token - TOTP code to verify
 * @param window - Number of time windows to check (default: 1, allows ±30 seconds)
 * @returns True if token is valid
 */
export function verifyTOTP(secret: string, token: string, window: number = 1): boolean {
  const time = Math.floor(Date.now() / 1000);
  
  for (let i = -window; i <= window; i++) {
    const counter = time + (i * TOTP_PERIOD);
    const expected = generateTOTP(secret, counter);
    if (expected === token) {
      return true;
    }
  }
  
  return false;
}

/**
 * Generate TOTP provisioning URI for QR code
 * @param secret - Base32 encoded secret
 * @param account - Account name (email or username)
 * @param issuer - Service name (e.g., "Scratch Solid Solutions")
 * @returns URI for QR code generation
 */
export function generateTOTPUri(secret: string, account: string, issuer: string): string {
  const encodedAccount = encodeURIComponent(account);
  const encodedIssuer = encodeURIComponent(issuer);
  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;
}

/**
 * Get remaining time until next TOTP refresh
 * @returns Seconds until next code refresh
 */
export function getTOTPTimeRemaining(): number {
  const time = Math.floor(Date.now() / 1000);
  return TOTP_PERIOD - (time % TOTP_PERIOD);
}

/**
 * TOTP configuration for user
 */
export interface TOTPConfig {
  secret: string;
  enabled: boolean;
  verified: boolean;
  backupCodes?: string[];
}

/**
 * Generate backup codes for account recovery
 * @param count - Number of backup codes to generate
 * @returns Array of backup codes
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(code);
  }
  return codes;
}
