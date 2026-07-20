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
    const { page, limit, offset } = parsePaginationParams({
      page: searchParams.get('page'),
      limit: searchParams.get('limit')
    });

    // Get cleaner list with onboarding status. department = 'cleaning'
    // keeps this scoped to cleaners only, matching cleaner_profiles' old
    // implicit scope now that staff also holds supervisors/digital/
    // transport rows (2026-07-20 consolidation).
    const cleanersQuery = `
      SELECT
        s.id,
        s.paysheet_code,
        s.first_name,
        s.last_name,
        s.status,
        tp.completion_percentage,
        tp.completed as training_completed,
        tp.background_check_consent,
        tp.contract_signed,
        u.email,
        u.onboarding_stage,
        u.created_at as joined_at
      FROM staff s
      LEFT JOIN training_progress tp ON s.paysheet_code = tp.employee_id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.department = 'cleaning'
      ORDER BY u.created_at DESC
    `;

    // Get total count
    const countResult = await db.prepare(
      "SELECT COUNT(*) as count FROM staff s WHERE s.department = 'cleaning'"
    ).first();
    const total = (countResult as any)?.count || 0;

    // Get paginated results
    const cleaners = await db.prepare(cleanersQuery + ' LIMIT ? OFFSET ?')
      .bind(limit, offset)
      .all();
    const cleanerRows = ((cleaners.results || []) as Array<Record<string, unknown>>).map((cleaner) => ({
      id: cleaner.id,
      paysheet_code: cleaner.paysheet_code,
      name: `${cleaner.first_name || ''} ${cleaner.last_name || ''}`.trim(),
      email: cleaner.email,
      status: cleaner.status || ((cleaner.training_completed as number) === 1 ? 'active' : 'pending'),
      training_completion: Number(cleaner.completion_percentage || 0),
      onboarding_stage: cleaner.onboarding_stage || (((cleaner.training_completed as number) === 1) ? 'training_completed' : ((cleaner.contract_signed as number) === 1 ? 'contract_signed' : ((cleaner.background_check_consent as number) === 1 ? 'consent_approved' : 'consent_pending'))),
      joined_at: cleaner.joined_at,
    }));
    const activeCleaners = cleanerRows.filter((cleaner) => cleaner.status === 'active').length;
    const trainingComplete = cleanerRows.filter((cleaner) => cleaner.training_completion >= 100 || cleaner.onboarding_stage === 'training_completed' || cleaner.onboarding_stage === 'active').length;
    const pendingOnboarding = cleanerRows.length - trainingComplete;

    // Log audit event
    log.audit('VIEW', 'cleaners_overview', {
      traceId,
      userId,
      page,
      limit
    });

    const response = NextResponse.json({
      success: true,
      data: {
        total: total,
        active: activeCleaners,
        pending_onboarding: pendingOnboarding,
        training_complete: trainingComplete,
        cleaners: cleanerRows,
      },
      pagination: calculatePagination(page, limit, total)
    });
    response.headers.set('Cache-Control', 'private, max-age=60');
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Cleaners overview fetch error:', error);
    log.error('Failed to fetch cleaners overview', error instanceof Error ? error : new Error(String(error)), { traceId, userId });
    
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Failed to fetch cleaners overview: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
