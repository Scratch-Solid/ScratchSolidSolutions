export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withTracing, withSecurityHeaders } from '@/lib/middleware';
import { validateEmail, validatePhone, validateSAIDNumber, validateSAPassportNumber, sanitizeInput } from '@/lib/validation';
import { log } from '@/lib/logger';
import crypto from 'crypto';

// Simple encryption function for sensitive data (POPIA compliance)
// In production, use proper encryption like AES-256-GCM with Cloudflare Workers secrets
function encryptData(data: string): string {
  const algorithm = 'aes-256-cbc';
  const key = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  // For now, return base64 of iv + encrypted (key should be stored securely)
  return Buffer.concat([iv, Buffer.from(encrypted, 'hex')]).toString('base64');
}

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);

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
    };

    const { name, id_number, email, phone, whatsapp, address, emergency_contact, bank_details } = body;

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
    const idValidation = validateSAIDNumber(id_number);
    const passportValidation = validateSAPassportNumber(id_number);
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

    // Sanitize inputs
    const sanitizedName = sanitizeInput(name);
    const sanitizedAddress = sanitizeInput(address);
    const sanitizedEmergencyContact = sanitizeInput(emergency_contact);
    const sanitizedBankDetails = sanitizeInput(bank_details);
    const sanitizedWhatsapp = whatsapp ? sanitizeInput(whatsapp) : phone;

    // Encrypt sensitive data (POPIA compliance)
    const encryptedIdNumber = encryptData(id_number);
    const encryptedBankDetails = encryptData(sanitizedBankDetails);

    // TODO: Integrate with DocuSign for e-signature
    // For now, generate a placeholder signature ID
    const signatureId = `DOCUSIGN_PLACEHOLDER_${Date.now()}`;

    // Insert into new_joiners table
    await db.prepare(
      `INSERT INTO new_joiners (
        name, id_number, email, phone, whatsapp, address, emergency_contact, 
        bank_details, signature_id, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'), datetime('now'))`
    ).bind(
      sanitizedName,
      encryptedIdNumber,
      email,
      phone,
      sanitizedWhatsapp,
      sanitizedAddress,
      sanitizedEmergencyContact,
      encryptedBankDetails,
      signatureId
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
