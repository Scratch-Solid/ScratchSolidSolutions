export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withSecurityHeaders, withTracing, withCsrf } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  const csrfResponse = await withCsrf(request);
  if (csrfResponse) return withSecurityHeaders(csrfResponse, traceId);

  try {
    const applicants = await db.prepare(`
      SELECT 
        u.id,
        u.name,
        u.phone,
        u.email,
        s.department,
        u.onboarding_stage,
        u.created_at
      FROM users u
      LEFT JOIN staff s ON u.id = s.user_id
      WHERE u.onboarding_stage IS NOT NULL
      ORDER BY u.created_at DESC
    `).all();

    return withSecurityHeaders(NextResponse.json({ applicants: applicants.results || [] }), traceId);
  } catch (error) {
    console.error('Pipeline data error:', error);
    return withSecurityHeaders(NextResponse.json({ error: `Failed to get pipeline data: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 }), traceId);
  }
}
