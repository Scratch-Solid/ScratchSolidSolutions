import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withSecurityHeaders, withTracing, withRateLimit, withAuth, withCsrf } from '@/lib/middleware';
import { sanitizeRequestBody } from '@/lib/sanitization';

export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  const csrfResponse = await withCsrf(request);
  if (csrfResponse) return csrfResponse;

  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['cleaner', 'digital', 'transport']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;
  const userId = (user as any).id;

  const body = await request.json();

  // Sanitize input
  const { sanitized, error } = sanitizeRequestBody(body, {
    required: ['signatureDate'],
    optional: []
  });

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  const { signatureDate } = sanitized as { signatureDate: string };

  try {
    // Get the user's cleaner profile
    const cleanerProfile = await db.prepare('SELECT * FROM cleaner_profiles WHERE user_id = ?').bind(userId).first();
    if (!cleanerProfile) {
      return NextResponse.json({ error: 'Cleaner profile not found' }, { status: 404 });
    }

    // Update cleaner profile with contract signature date
    await db.prepare(
      `UPDATE cleaner_profiles SET contract_signed = 1, contract_signed_date = ?, updated_at = datetime('now') WHERE user_id = ?`
    ).bind(signatureDate, userId).run();

    // Update user status to active
    await db.prepare(
      `UPDATE users SET updated_at = datetime('now') WHERE id = ?`
    ).bind(userId).run();

    const response = NextResponse.json({ success: true, signatureDate });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Sign contract error:', error);
    const response = NextResponse.json({ error: 'Failed to sign contract' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
