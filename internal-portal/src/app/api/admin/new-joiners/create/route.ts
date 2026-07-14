export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { log } from '@/lib/logger';
import { validatePhone, validateSaIdNumber, validateSaPassport } from '@/lib/validation';

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;
  const userId = authResult.user?.id;

  try {
    const body = await request.json() as {
      fullName?: string;
      idPassportNumber?: string;
      contactNumber?: string;
      positionAppliedFor?: string;
    };

    const { fullName, idPassportNumber, contactNumber, positionAppliedFor } = body;

    // Validate required fields
    if (!fullName || !idPassportNumber || !contactNumber) {
      return withSecurityHeaders(
        NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Full name, ID/Passport number, and contact number are required' } }, { status: 400 }),
        traceId
      );
    }

    // Validate phone
    const phoneValidation = validatePhone(contactNumber);
    if (!phoneValidation.valid) {
      return withSecurityHeaders(
        NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: phoneValidation.errors.join(', ') } }, { status: 400 }),
        traceId
      );
    }

    // Validate ID/Passport
    const idPassportValidation = idPassportNumber.replace(/\D/g, '').length === 13
      ? validateSaIdNumber(idPassportNumber)
      : validateSaPassport(idPassportNumber);
    if (!idPassportValidation.valid) {
      return withSecurityHeaders(
        NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: idPassportValidation.errors.join(', ') } }, { status: 400 }),
        traceId
      );
    }

    // Ensure required columns exist
    await db.prepare(`ALTER TABLE new_joiners ADD COLUMN position_applied_for TEXT`).run().catch(() => {});
    await db.prepare(`ALTER TABLE new_joiners ADD COLUMN created_at DATETIME`).run().catch(() => {});
    await db.prepare(`ALTER TABLE new_joiners ADD COLUMN updated_at DATETIME`).run().catch(() => {});

    // Generate sensible defaults for missing fields
    const email = `${fullName.toLowerCase().replace(/[^a-z0-9]/g, '')}@scratch.local`;
    const whatsapp = contactNumber;
    const address = 'To be updated';
    const emergencyContact = 'To be updated';
    const bankDetails = null;
    const signatureId = null;

    // Check for duplicate ID number
    const existing = await db.prepare('SELECT id FROM new_joiners WHERE id_number = ?').bind(idPassportNumber).first();
    if (existing) {
      return withSecurityHeaders(
        NextResponse.json({ success: false, error: { code: 'DUPLICATE_ERROR', message: 'A joiner with this ID/Passport number already exists' } }, { status: 409 }),
        traceId
      );
    }

    const result = await db.prepare(
      `INSERT INTO new_joiners (
        name, id_number, email, phone, whatsapp, address, emergency_contact, 
        bank_details, signature_id, status, position_applied_for, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, datetime('now'), datetime('now'))`
    ).bind(
      fullName,
      idPassportNumber,
      email,
      contactNumber,
      whatsapp,
      address,
      emergencyContact,
      bankDetails,
      signatureId,
      positionAppliedFor || 'Cleaner'
    ).run();

    const joinerId = result.meta.last_row_id;

    log.audit('CREATE', 'new_joiner', {
      traceId,
      userId,
      joinerId,
      name: fullName,
      idNumber: idPassportNumber,
    });

    const response = NextResponse.json({
      success: true,
      message: 'New joiner created successfully',
      data: {
        id: joinerId,
        fullName,
        idPassportNumber,
        contactNumber,
        positionAppliedFor: positionAppliedFor || 'Cleaner',
        status: 'pending',
      }
    }, { status: 201 });

    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('New joiner creation error:', error);
    log.error('Failed to create new joiner', error instanceof Error ? error : new Error(String(error)), { traceId, userId });

    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Failed to create new joiner: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });

    return withSecurityHeaders(response, traceId);
  }
}
