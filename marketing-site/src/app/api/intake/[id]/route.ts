export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { sanitizeText } from '@/lib/sanitization';
import { withAdminOrServiceAuth, withRateLimit, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { getDb, getIntakeRequest, updateIntakeRequest, getIntakeIterations } from '@/lib/db';
import { resolveSupportTier } from '@/lib/digital-pricing';
import { sendCustomQuoteNeededEmail, sendCustomQuoteNeededAdminAlertEmail } from '@/lib/email';

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
      // rate/min-term are never taken from the client - always re-derived
      // from the server's own tier table (see digital-pricing.ts), same
      // fix as the POST route. This previously accepted
      // support_monthly_rate/support_min_term_months directly from the
      // request body.
      const tier = resolveSupportTier(body.support_tier);
      updates.support_tier = tier.id;
      updates.support_monthly_rate = tier.rate;
      updates.support_min_term_months = tier.minMonths;
    }
    if (ALLOWED_STATUSES.includes(body.status)) updates.status = body.status;

    if (Object.keys(updates).length === 0) {
      return withSecurityHeaders(NextResponse.json({ error: 'No valid fields to update' }, { status: 400 }), traceId);
    }

    const updated = await updateIntakeRequest(db, Number(id), updates);

    // Fired exactly once, at the point the client confirms their mockup - a
    // one-time client action, so this can't double-send under normal use.
    // has_custom_items is fixed at mockup-generation time (the client can
    // only toggle pages in/out afterwards, never change a page's type), so
    // checking it here reflects the real final state.
    if (updates.status === 'confirmed' && (existing as Record<string, any>).has_custom_items) {
      const clientName = (existing as any).name || (existing as any).company_name || 'there';
      try {
        await sendCustomQuoteNeededEmail((existing as any).email, clientName);
      } catch (emailError) {
        logger.error('Failed to send custom-quote-needed client email', emailError as Error);
      }
      try {
        await sendCustomQuoteNeededAdminAlertEmail(clientName, (existing as any).email, (existing as any).company_name || (existing as any).name || `Intake #${id}`, Number(id));
      } catch (emailError) {
        logger.error('Failed to send custom-quote-needed admin alert email', emailError as Error);
      }
    }

    return withSecurityHeaders(NextResponse.json(updated), traceId);
  } catch (error) {
    logger.error('Error updating intake request', error as Error);
    const response = NextResponse.json({ error: `Failed to update project request: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
