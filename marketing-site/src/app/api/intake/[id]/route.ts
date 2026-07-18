export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { sanitizeText } from '@/lib/sanitization';
import { withAdminOrServiceAuth, withRateLimit, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { getDb, getIntakeRequest, updateIntakeRequest, getIntakeIterations } from '@/lib/db';

const ALLOWED_STATUSES = ['draft', 'generating', 'awaiting_confirmation', 'confirmed', 'abandoned'];

// GET /api/intake/[id] — staff detail view (admin/service token only): full
// brief plus every mockup iteration generated so far.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);
  const auth = await withAdminOrServiceAuth(request);
  if (auth instanceof NextResponse) return withSecurityHeaders(auth, traceId);
  const { db } = auth;

  try {
    const { id } = await params;
    const intake = await getIntakeRequest(db, Number(id));
    if (!intake) {
      return withSecurityHeaders(NextResponse.json({ error: 'Intake request not found' }, { status: 404 }), traceId);
    }
    const iterations = await getIntakeIterations(db, Number(id));
    return withSecurityHeaders(NextResponse.json({ ...(intake as Record<string, any>), iterations }), traceId);
  } catch (error) {
    logger.error('Error fetching intake request', error as Error);
    const response = NextResponse.json({ error: `Failed to fetch intake request: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

// PUT /api/intake/[id] — public. Used by the wizard itself: editing brief
// fields before the first mockup generation, and the client marking their own
// request "confirmed" once they're happy with a mockup. Guests have no
// session, so the only guard is that the intake isn't already converted/
// abandoned — same trust level as the rest of this guest-facing flow.
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);

  const rateLimitResult = await withRateLimit(request, { windowMs: 3600000, maxRequests: 60 });
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 }), traceId);
  }

  try {
    const db = await getDb();
    if (!db) {
      return withSecurityHeaders(NextResponse.json({ error: 'Database not available' }, { status: 500 }), traceId);
    }
    const { id } = await params;
    const existing = await getIntakeRequest(db, Number(id));
    if (!existing) {
      return withSecurityHeaders(NextResponse.json({ error: 'Intake request not found' }, { status: 404 }), traceId);
    }
    if ((existing as any).status === 'converted' || (existing as any).status === 'abandoned') {
      return withSecurityHeaders(NextResponse.json({ error: 'This request can no longer be edited' }, { status: 400 }), traceId);
    }

    const body = await request.json() as Record<string, any>;
    const updates: Record<string, any> = {};

    const textFields = [
      'company_name', 'who_target_users', 'what_description', 'why_description',
      'when_timeline', 'where_context', 'how_description', 'backend_interaction_description',
    ];
    for (const field of textFields) {
      if (typeof body[field] === 'string') updates[field] = sanitizeText(body[field]);
    }
    if (typeof body.logo_file_url === 'string') updates.logo_file_url = body.logo_file_url;
    if (typeof body.color_theme === 'string') updates.color_theme = body.color_theme;
    if (['warranty', 'standard', 'growth', 'partner'].includes(body.support_tier)) {
      updates.support_tier = body.support_tier;
    }
    if (typeof body.support_monthly_rate === 'number') updates.support_monthly_rate = body.support_monthly_rate;
    if (typeof body.support_min_term_months === 'number') updates.support_min_term_months = body.support_min_term_months;
    if (ALLOWED_STATUSES.includes(body.status)) updates.status = body.status;

    if (Object.keys(updates).length === 0) {
      return withSecurityHeaders(NextResponse.json({ error: 'No valid fields to update' }, { status: 400 }), traceId);
    }

    const updated = await updateIntakeRequest(db, Number(id), updates);
    return withSecurityHeaders(NextResponse.json(updated), traceId);
  } catch (error) {
    logger.error('Error updating intake request', error as Error);
    const response = NextResponse.json({ error: `Failed to update project request: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
