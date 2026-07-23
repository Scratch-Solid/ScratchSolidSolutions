export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { decryptField } from '@/lib/encryption';
import { log } from '@/lib/logger';

// Decrypts and returns one applicant's full details (ID number, address,
// emergency contact) - separate from the list endpoint (which never
// decrypts anything) so sensitive fields are only ever decrypted one
// record at a time, on an admin's explicit request, and audit-logged.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;
  const userId = authResult.user?.id;

  const { id } = await params;
  try {
    const joinerId = parseInt(id);
    const joiner = await db.prepare('SELECT * FROM new_joiners WHERE id = ?').bind(joinerId).first();

    if (!joiner) {
      const response = NextResponse.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Application not found' }
      }, { status: 404 });
      return withSecurityHeaders(response, traceId);
    }

    const row = joiner as any;

    const [idNumber, phone, whatsapp, emergencyContact] = await Promise.all([
      row.id_number ? decryptField(row.id_number).catch(() => row.id_number) : Promise.resolve(''),
      row.phone ? decryptField(row.phone).catch(() => row.phone) : Promise.resolve(''),
      row.whatsapp ? decryptField(row.whatsapp).catch(() => row.whatsapp) : Promise.resolve(''),
      row.emergency_contact ? decryptField(row.emergency_contact).catch(() => row.emergency_contact) : Promise.resolve(''),
    ]);
    const bankDetails = row.bank_details ? await decryptField(row.bank_details).catch(() => row.bank_details) : null;

    // Viewing a decrypted ID number is exactly the kind of access that needs
    // an audit trail - who looked up whose ID, and when.
    log.audit('VIEW_SENSITIVE_DETAILS', 'new_joiners', {
      traceId,
      userId,
      joinerId,
      applicantEmail: row.email,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        id: row.id,
        fullName: row.name || '',
        role: row.role || 'cleaner',
        idPassportNumber: idNumber || '',
        contactNumber: phone || '',
        whatsapp: whatsapp || '',
        email: row.email || '',
        address: row.address || '',
        emergencyContact: emergencyContact || '',
        bankDetails: bankDetails || null,
        message: row.message || '',
        positionAppliedFor: row.position_applied_for || 'Cleaner',
        status: row.status,
        popiaConsent: Boolean(row.popia_consent),
        backgroundCheckConsent: Boolean(row.background_check_consent),
        createdAt: row.created_at,
      }
    });
    response.headers.set('Cache-Control', 'no-store');
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('New joiner detail fetch error:', error);
    log.error('Failed to fetch new joiner detail', error instanceof Error ? error : new Error(String(error)), { traceId, userId, joinerId: id });

    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Failed to fetch application detail: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
