export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createSignupSignatureReference } from '@/lib/cleaner-integrations';
import { withTracing, withSecurityHeaders, withRateLimit } from '@/lib/middleware';
import { validateEmail, validatePhone, validateSaIdNumber, validateSaPassport, sanitizeInput } from '@/lib/validation';
import { log } from '@/lib/logger';
import { encryptField } from '@/lib/encryption';
import { getEnvVarOptional } from '@/lib/env';

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);

  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse) return withSecurityHeaders(rateLimitResponse, traceId);

  try {
    const db = await getDb();
    if (!db) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Database unavailable',
          suggestion: 'Please try again later'
        }
      }, { status: 503 });
      return withSecurityHeaders(response, traceId);
    }

    const body = await request.json() as {
      name?: string;
      id_number?: string;
      email?: string;
      phone?: string;
      whatsapp?: string;
      address?: string;
      emergency_contact?: string;
      bank_details?: string;
      popia_consent?: boolean;
      background_check_consent?: boolean;
    };

    const { name, id_number, email, phone, whatsapp, address, emergency_contact, bank_details, popia_consent, background_check_consent } = body;

    // Validate required fields
    if (!name || !id_number || !email || !phone || !address || !emergency_contact || !bank_details) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields',
          details: {
            required_fields: ['name', 'id_number', 'email', 'phone', 'address', 'emergency_contact', 'bank_details']
          },
          suggestion: 'Please provide all required fields'
        }
      }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid email address',
          details: { errors: emailValidation.errors }
        }
      }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // Validate phone
    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.valid) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid phone number',
          details: { errors: phoneValidation.errors }
        }
      }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // Validate ID number (SA ID or Passport)
    const idValidation = validateSaIdNumber(id_number);
    const passportValidation = validateSaPassport(id_number);
    if (!idValidation.valid && !passportValidation.valid) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid ID number or passport',
          details: { errors: ['Must be a valid South African ID number or passport number'] }
        }
      }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // Validate bank details format
    const bankParts = bank_details.split('|').map(s => s.trim());
    if (bankParts.length !== 4 || bankParts.some(p => !p)) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid bank details format',
          details: { errors: ['Bank details must include bank name, account holder, account number, and branch code'] }
        }
      }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }
    const [, , accountNumber, branchCode] = bankParts;
    if (!/^\d{6,12}$/.test(accountNumber.replace(/\s/g, ''))) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid bank account number',
          details: { errors: ['Account number must be 6-12 digits'] }
        }
      }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }
    if (!/^\d{4,6}$/.test(branchCode.replace(/\s/g, ''))) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid branch code',
          details: { errors: ['Branch code must be 4-6 digits'] }
        }
      }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // Check if email already exists in new_joiners
    const existingEmail = await db.prepare(
      'SELECT id FROM new_joiners WHERE email = ?'
    ).bind(email).first();

    if (existingEmail) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'DUPLICATE_ENTRY',
          message: 'An application with this email already exists',
          suggestion: 'Please contact support if you believe this is an error'
        }
      }, { status: 409 });
      return withSecurityHeaders(response, traceId);
    }

    // Check if ID number already exists
    const existingId = await db.prepare(
      'SELECT id FROM new_joiners WHERE id_number = ?'
    ).bind(id_number).first();

    if (existingId) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'DUPLICATE_ENTRY',
          message: 'An application with this ID number already exists',
          suggestion: 'Please contact support if you believe this is an error'
        }
      }, { status: 409 });
      return withSecurityHeaders(response, traceId);
    }

    // Validate POPIA consent (mandatory)
    if (!popia_consent) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'POPIA consent required',
          details: { errors: ['You must consent to the POPIA privacy policy to proceed'] }
        }
      }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // Sanitize inputs
    const sanitizedName = sanitizeInput(name);
    const sanitizedAddress = sanitizeInput(address);
    const sanitizedEmergencyContact = sanitizeInput(emergency_contact);
    const sanitizedBankDetails = sanitizeInput(bank_details);
    const sanitizedWhatsapp = whatsapp ? sanitizeInput(whatsapp) : phone;

    // Encrypt sensitive data (POPIA compliance)
    const encryptionKey = getEnvVarOptional('ENCRYPTION_KEY');
    if (!encryptionKey) {
      log.error('ENCRYPTION_KEY not configured', new Error('Missing ENCRYPTION_KEY'), { traceId });
    }
    const encryptedIdNumber = encryptionKey ? encryptField(id_number, encryptionKey) : id_number;
    const encryptedBankDetails = encryptionKey ? encryptField(sanitizedBankDetails, encryptionKey) : sanitizedBankDetails;

    // TODO: Integrate with DocuSign for e-signature
    // For now, generate a placeholder signature ID
    const { signatureId, integration } = await createSignupSignatureReference(traceId);

    // Ensure consent columns exist (backward-compatible migration)
    await db.prepare(`ALTER TABLE new_joiners ADD COLUMN popia_consent INTEGER DEFAULT 0`).run().catch(() => {});
    await db.prepare(`ALTER TABLE new_joiners ADD COLUMN background_check_consent INTEGER DEFAULT 0`).run().catch(() => {});

    // Insert into new_joiners table
    await db.prepare(
      `INSERT INTO new_joiners (
        name, id_number, email, phone, whatsapp, address, emergency_contact,
        bank_details, signature_id, status, popia_consent, background_check_consent, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      sanitizedName,
      encryptedIdNumber,
      email,
      phone,
      sanitizedWhatsapp,
      sanitizedAddress,
      sanitizedEmergencyContact,
      encryptedBankDetails,
      signatureId,
      popia_consent ? 1 : 0,
      background_check_consent ? 1 : 0
    ).run();

    // Log audit event
    log.audit('SUBMIT', 'cleaner_application', {
      traceId,
      email,
      name: sanitizedName,
      signatureId
    });

    const response = NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        application_id: signatureId,
        signature_reference: signatureId,
        integration,
        status: 'pending',
        next_steps: [
          'Your application has been submitted for review',
          'You will be notified once your application is approved',
          'Upon approval, you will receive your paysheet code to log in'
        ]
      }
    });

    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Cleaner signup error:', error);
    log.error('Cleaner signup failed', error instanceof Error ? error : new Error(String(error)), { traceId });
    
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to submit application',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
