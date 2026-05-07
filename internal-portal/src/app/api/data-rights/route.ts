import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUserById } from '@/lib/db';
import { withAuth, withSecurityHeaders, withTracing, withRateLimit } from '@/lib/middleware';
import { logAuditEvent } from '@/lib/db';

// POPIA Data Subject Rights Implementation
// This endpoint allows users to exercise their rights under POPIA:
// 1. Right to access their personal information
// 2. Right to request deletion of their personal information

export async function GET(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  const traceId = withTracing(request);
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  try {
    const userId = (user as any).id;
    
    // Get user's personal information
    const userData = await getUserById(db, userId);
    
    // Get cleaner profile if exists
    const cleanerProfile = await db.prepare(
      'SELECT * FROM cleaner_profiles WHERE user_id = ?'
    ).bind(userId).first();

    // Get bookings if cleaner
    let bookings = null;
    if ((user as any).role === 'cleaner') {
      bookings = await db.prepare(
        'SELECT id, service_id, booking_date, status, created_at FROM bookings WHERE cleaner_id = ?'
      ).bind(userId).all();
    }

    // Get audit logs related to this user
    const auditLogs = await db.prepare(
      'SELECT action, resource_type, resource_id, details, created_at FROM audit_logs WHERE admin_id = ?'
    ).bind(userId).all();

    const response = NextResponse.json({
      user: {
        email: (userData as any)?.email,
        name: (userData as any)?.name,
        phone: (userData as any)?.phone,
        address: (userData as any)?.address,
        role: (userData as any)?.role,
        created_at: (userData as any)?.created_at
      },
      cleaner_profile: cleanerProfile || null,
      bookings: bookings?.results || null,
      audit_activity: auditLogs.results || null,
      data_collected_at: new Date().toISOString()
    });
    
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Data access error:', error);
    const response = NextResponse.json({ error: 'Failed to retrieve data' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function DELETE(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  const traceId = withTracing(request);
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  try {
    const userId = (user as any).id;
    const body = await request.json() as { confirmation?: string };
    
    // Require explicit confirmation
    if (body.confirmation !== 'DELETE_MY_DATA') {
      const response = NextResponse.json({ 
        error: 'Explicit confirmation required. Set confirmation to "DELETE_MY_DATA"' 
      }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // Start transaction-like deletion
    // Delete cleaner profile
    await db.prepare('DELETE FROM cleaner_profiles WHERE user_id = ?').bind(userId).run();
    
    // Delete bookings (as cleaner)
    await db.prepare('DELETE FROM bookings WHERE cleaner_id = ?').bind(userId).run();
    
    // Delete sessions
    await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run();
    
    // Delete refresh tokens
    await db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').bind(userId).run();
    
    // Delete user
    await db.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();

    // Log the deletion for compliance
    const ipAddress = request.headers.get('x-forwarded-for') || '';
    await logAuditEvent(
      db, 
      userId, 
      'data_deletion_request', 
      'user', 
      userId, 
      JSON.stringify({ 
        reason: 'Data subject requested deletion under POPIA Section 24' 
      }), 
      ipAddress
    );

    const response = NextResponse.json({ 
      success: true, 
      message: 'Your data has been deleted as per your rights under POPIA' 
    });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Data deletion error:', error);
    const response = NextResponse.json({ error: 'Failed to delete data' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
