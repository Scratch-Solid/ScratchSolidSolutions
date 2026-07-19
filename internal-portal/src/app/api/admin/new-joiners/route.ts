export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { parsePaginationParams, calculatePagination } from '@/lib/pagination';
import { log } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;
  const userId = authResult.user?.id;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const { page, limit, offset } = parsePaginationParams({
      page: searchParams.get('page'),
      limit: searchParams.get('limit')
    });

    let query = 'SELECT * FROM new_joiners';
    const conditions: string[] = [];
    const params: any[] = [];

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
    const countResult = await db.prepare(countQuery).bind(...params).first();
    const total = (countResult as any)?.count || 0;

    // Get paginated results
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const joiners = await db.prepare(query).bind(...params).all();

    // Normalize rows to camelCase shape expected by the admin frontend
    const normalizeRow = (row: any) => {
      const name = row.name || row.full_name || '';
      return {
        id: row.id,
        fullName: name,
        role: row.role || 'cleaner',
        idPassportNumber: row.id_number || row.id_passport_number || '',
        contactNumber: row.phone || row.contact_number || row.contactNumber || '',
        email: row.email || '',
        whatsapp: row.whatsapp || row.phone || '',
        address: row.address || '',
        emergencyContact: row.emergency_contact || '',
        bankDetails: row.bank_details || null,
        message: row.message || '',
        positionAppliedFor: row.position_applied_for || 'Cleaner',
        status: row.status,
        popiaConsent: Boolean(row.popia_consent),
        backgroundCheckConsent: Boolean(row.background_check_consent),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    };

    const data = ((joiners.results || []) as any[]).map(normalizeRow);

    // Log audit event
    log.audit('VIEW', 'new_joiners', {
      traceId,
      userId,
      status,
      page,
      limit
    });

    const response = NextResponse.json({
      success: true,
      data,
      pagination: calculatePagination(page, limit, total)
    });
    response.headers.set('Cache-Control', 'private, max-age=60');
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('New joiners fetch error:', error);
    log.error('Failed to fetch new joiners', error instanceof Error ? error : new Error(String(error)), { traceId, userId });
    
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Failed to fetch new joiners: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
