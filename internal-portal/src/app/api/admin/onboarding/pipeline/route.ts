export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
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
        u.created_at,
        tp.background_check_consent,
        tp.background_check_consent_at,
        tp.contract_signed,
        tp.contract_signed_at,
        tp.contract_signature_id,
        tp.completion_percentage AS training_completion_percentage,
        tp.completed AS training_completed
      FROM users u
      LEFT JOIN staff s ON u.id = s.user_id
      LEFT JOIN training_progress tp ON s.paysheet_code = tp.employee_id
      WHERE u.onboarding_stage IS NOT NULL
        AND u.role IN ('cleaner', 'digital', 'transport')
      ORDER BY u.created_at DESC
    `).all();

    return withSecurityHeaders(NextResponse.json({ applicants: applicants.results || [] }), traceId);
  } catch (error) {
    console.error('Pipeline data error:', error);
    return withSecurityHeaders(NextResponse.json({ error: `Failed to get pipeline data: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 }), traceId);
  }
}
