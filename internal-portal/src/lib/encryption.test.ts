import { encrypt, decrypt, hashData, verifyHash, encryptField, decryptField, shouldEncryptField } from './encryption';

describe('AES-256-GCM Encryption (Web Crypto)', () => {
  const testKey = 'a'.repeat(32); // 32-char password for PBKDF2

  beforeAll(() => {
    process.env.ENCRYPTION_KEY = testKey;
  });

  test('encrypts and decrypts plaintext correctly', async () => {
    const plaintext = 'Hello, World! This is sensitive PII: 12345';
    const ciphertext = await encrypt(plaintext, testKey);
    expect(ciphertext).not.toBe(plaintext);
    expect(ciphertext.length).toBeGreaterThan(plaintext.length);

    const decrypted = await decrypt(ciphertext, testKey);
    expect(decrypted).toBe(plaintext);
  });

  test('different ciphertexts for same plaintext (salt randomization)', async () => {
    const plaintext = 'same text';
    const c1 = await encrypt(plaintext, testKey);
    const c2 = await encrypt(plaintext, testKey);
    expect(c1).not.toBe(c2);
  });

  test('throws on wrong decryption key', async () => {
    const ciphertext = await encrypt('secret', testKey);
    await expect(decrypt(ciphertext, 'wrong-key-wrong-key-wrong-key-w')).rejects.toThrow();
  });

  test('throws when encryption key is empty', async () => {
    await expect(encrypt('test', '')).rejects.toThrow('Encryption password required');
  });

  test('throws when decryption key is empty', async () => {
    await expect(decrypt('test', '')).rejects.toThrow('Decryption password required');
  });
});

describe('Hash functions', () => {
  test('hashData produces consistent SHA-256 hex', async () => {
    const h1 = await hashData('same input');
    const h2 = await hashData('same input');
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
  });

  test('different inputs produce different hashes', async () => {
    const h1 = await hashData('input A');
    const h2 = await hashData('input B');
    expect(h1).not.toBe(h2);
  });

  test('verifyHash returns true for matching data', async () => {
    const h = await hashData('test');
    expect(await verifyHash('test', h)).toBe(true);
  });

  test('verifyHash returns false for non-matching data', async () => {
    const h = await hashData('test');
    expect(await verifyHash('wrong', h)).toBe(false);
  });
});

describe('Field encryption helpers', () => {
  const testKey = 'b'.repeat(32);

  beforeAll(() => {
    process.env.ENCRYPTION_KEY = testKey;
  });

  test('encryptField returns encrypted value', async () => {
    const encrypted = await encryptField('sensitive-id-123');
    expect(encrypted).toBeTruthy();
    expect(encrypted).not.toBe('sensitive-id-123');
  });

  test('encryptField returns null for empty values', async () => {
    expect(await encryptField(null)).toBeNull();
    expect(await encryptField(undefined)).toBeNull();
    expect(await encryptField('')).toBeNull();
  });

  test('decryptField reverses encryptField', async () => {
    const original = 'id_number_12345';
    const encrypted = await encryptField(original);
    const decrypted = await decryptField(encrypted);
    expect(decrypted).toBe(original);
  });

  test('decryptField returns null for empty values', async () => {
    expect(await decryptField(null)).toBeNull();
    expect(await decryptField(undefined)).toBeNull();
    expect(await decryptField('')).toBeNull();
  });
});

describe('Field classification', () => {
  test('shouldEncryptField recognizes sensitive fields', () => {
    expect(shouldEncryptField('id_number')).toBe(true);
    expect(shouldEncryptField('id_passport_number')).toBe(true);
    expect(shouldEncryptField('bank_account_number')).toBe(true);
    expect(shouldEncryptField('bank_account')).toBe(true);
    expect(shouldEncryptField('phone')).toBe(true);
    expect(shouldEncryptField('cellphone')).toBe(true);
    expect(shouldEncryptField('tax_id')).toBe(true);
    expect(shouldEncryptField('medical_information')).toBe(true);
    expect(shouldEncryptField('emergency_contact_details')).toBe(true);
  });

  test('shouldEncryptField rejects non-sensitive fields', () => {
    expect(shouldEncryptField('name')).toBe(false);
    expect(shouldEncryptField('email')).toBe(false);
    expect(shouldEncryptField('status')).toBe(false);
    expect(shouldEncryptField('created_at')).toBe(false);
  });
});
