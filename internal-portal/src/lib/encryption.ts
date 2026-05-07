import crypto from 'crypto';

// Data Encryption at Rest
// Provides AES-256-GCM encryption for sensitive data storage

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

/**
 * Derive encryption key from password and salt
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt data using AES-256-GCM
 * @param plaintext - Data to encrypt
 * @param password - Encryption key (use environment variable)
 * @returns Base64 encoded encrypted data with salt, IV, and auth tag
 */
export function encrypt(plaintext: string, password: string): string {
  if (!password) {
    throw new Error('Encryption password required');
  }

  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(password, salt);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ]);
  
  const tag = cipher.getAuthTag();

  // Combine salt + iv + tag + encrypted
  const combined = Buffer.concat([
    salt,
    iv,
    tag,
    encrypted
  ]);

  return combined.toString('base64');
}

/**
 * Decrypt data using AES-256-GCM
 * @param ciphertext - Base64 encoded encrypted data
 * @param password - Decryption key (must match encryption key)
 * @returns Decrypted plaintext
 */
export function decrypt(ciphertext: string, password: string): string {
  if (!password) {
    throw new Error('Decryption password required');
  }

  const combined = Buffer.from(ciphertext, 'base64');

  // Extract components
  const salt = combined.slice(0, SALT_LENGTH);
  const iv = combined.slice(SALT_LENGTH, TAG_POSITION);
  const tag = combined.slice(TAG_POSITION, ENCRYPTED_POSITION);
  const encrypted = combined.slice(ENCRYPTED_POSITION);

  const key = deriveKey(password, salt);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);

  return decrypted.toString('utf8');
}

/**
 * Hash sensitive data for comparison (one-way)
 * @param data - Data to hash
 * @returns Hex encoded hash
 */
export function hashData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Verify data against hash
 * @param data - Data to verify
 * @param hash - Hash to compare against
 * @returns True if data matches hash
 */
export function verifyHash(data: string, hash: string): boolean {
  return hashData(data) === hash;
}

/**
 * Generate a random encryption key
 * @returns Hex encoded random key
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Encrypt sensitive field for database storage
 * @param value - Value to encrypt
 * @param encryptionKey - Encryption key from environment
 * @returns Encrypted value or null if value is empty
 */
export function encryptField(value: string | null | undefined, encryptionKey: string): string | null {
  if (!value) return null;
  try {
    return encrypt(value, encryptionKey);
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt sensitive data');
  }
}

/**
 * Decrypt sensitive field from database storage
 * @param encryptedValue - Encrypted value from database
 * @param encryptionKey - Decryption key from environment
 * @returns Decrypted value or null if value is empty
 */
export function decryptField(encryptedValue: string | null | undefined, encryptionKey: string): string | null {
  if (!encryptedValue) return null;
  try {
    return decrypt(encryptedValue, encryptionKey);
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
  'bank_account_number',
  'tax_id',
  'medical_information',
  'emergency_contact_details'
];

/**
 * Check if a field should be encrypted
 * @param fieldName - Name of the field
 * @returns True if field should be encrypted
 */
export function shouldEncryptField(fieldName: string): boolean {
  return ENCRYPTED_FIELDS.includes(fieldName.toLowerCase());
}
