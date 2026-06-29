import { getCloudflareContext } from './runtime-context';

// Data Encryption at Rest
// Provides AES-256-GCM encryption using Web Crypto API (Cloudflare Workers compatible)

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const SALT_LENGTH = 16;
const IV_LENGTH = 12; // 96-bit IV recommended for GCM

// Helpers to support both Cloudflare Workers and Node.js test environments
function getSubtle(): SubtleCrypto {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    return crypto.subtle;
  }
  // Fallback for Node.js test environments (jsdom without subtle)
  const nodeCrypto = require('crypto');
  return nodeCrypto.webcrypto.subtle;
}

function getRandomValues<T extends ArrayBufferView | null>(array: T): T {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return crypto.getRandomValues(array);
  }
  const nodeCrypto = require('crypto');
  return nodeCrypto.webcrypto.getRandomValues(array);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const subtle = getSubtle();
  const keyMaterial = await subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data using AES-256-GCM
 * @param plaintext - Data to encrypt
 * @param password - Encryption key (use environment variable)
 * @returns Base64 encoded encrypted data with salt, IV, and auth tag
 */
export async function encrypt(plaintext: string, password: string): Promise<string> {
  if (!password) {
    throw new Error('Encryption password required');
  }

  const salt = getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(password, salt);

  const encrypted = await getSubtle().encrypt(
    { name: ALGORITHM, iv },
    key,
    new TextEncoder().encode(plaintext)
  );

  const combined = new Uint8Array(SALT_LENGTH + IV_LENGTH + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, SALT_LENGTH);
  combined.set(new Uint8Array(encrypted), SALT_LENGTH + IV_LENGTH);

  return arrayBufferToBase64(combined.buffer);
}

/**
 * Decrypt data using AES-256-GCM
 * @param ciphertext - Base64 encoded encrypted data
 * @param password - Decryption key (must match encryption key)
 * @returns Decrypted plaintext
 */
export async function decrypt(ciphertext: string, password: string): Promise<string> {
  if (!password) {
    throw new Error('Decryption password required');
  }

  const combined = new Uint8Array(base64ToArrayBuffer(ciphertext));

  const salt = combined.slice(0, SALT_LENGTH);
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const encrypted = combined.slice(SALT_LENGTH + IV_LENGTH);

  const key = await deriveKey(password, salt);

  const decrypted = await getSubtle().decrypt(
    { name: ALGORITHM, iv },
    key,
    encrypted
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Hash sensitive data for comparison (one-way) using Web Crypto
 * @param data - Data to hash
 * @returns Hex encoded hash
 */
export async function hashData(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const digest = await getSubtle().digest('SHA-256', encoder.encode(data));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verify data against hash
 * @param data - Data to verify
 * @param hash - Hash to compare against
 * @returns True if data matches hash
 */
export async function verifyHash(data: string, hash: string): Promise<boolean> {
  return (await hashData(data)) === hash;
}

/**
 * Generate a random encryption key
 * @returns Hex encoded random key
 */
export function generateEncryptionKey(): string {
  const bytes = getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getEncryptionKey(): Promise<string> {
  // Try Cloudflare runtime context first (secrets injected at deploy time)
  try {
    const ctx = await getCloudflareContext();
    const key = ctx.env.ENCRYPTION_KEY as string | undefined;
    if (key) return key;
  } catch {
    // Not on Cloudflare Workers — fall through to process.env
  }

  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required for sensitive data encryption');
  }
  return key;
}

/**
 * Encrypt sensitive field for database storage
 * @param value - Value to encrypt
 * @returns Encrypted value or null if value is empty
 */
export async function encryptField(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  try {
    return await encrypt(value, await getEncryptionKey());
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt sensitive data');
  }
}

/**
 * Decrypt sensitive field from database storage
 * @param encryptedValue - Encrypted value from database
 * @returns Decrypted value or null if value is empty
 */
export async function decryptField(encryptedValue: string | null | undefined): Promise<string | null> {
  if (!encryptedValue) return null;
  try {
    return await decrypt(encryptedValue, await getEncryptionKey());
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt sensitive data');
  }
}

/**
 * Field types that should be encrypted at rest
 */
export const ENCRYPTED_FIELDS = [
  'id_passport_number',
  'id_number',
  'bank_account_number',
  'bank_account',
  'tax_id',
  'medical_information',
  'emergency_contact_details',
  'phone',
  'cellphone',
];

/**
 * Check if a field should be encrypted
 * @param fieldName - Name of the field
 * @returns True if field should be encrypted
 */
export function shouldEncryptField(fieldName: string): boolean {
  return ENCRYPTED_FIELDS.includes(fieldName.toLowerCase());
}
