export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { validateString, validateEmail } from '@/lib/validation';
import { sanitizeText, sanitizeEmail } from '@/lib/sanitization';
import { withAdminOrServiceAuth, withRateLimit, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { getDb, createIntakeRequest, getAllIntakeRequests } from '@/lib/db';
import { resolveSupportTier } from '@/lib/digital-pricing';

// GET /api/intake — staff review queue (internal-portal admin/service token only).
// No client-facing GET is exposed — the wizard holds everything it needs in
// React state from the POST responses it already received (same reasoning that
// removed the public GET on /api/quote: don't expose guest submission data).
export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const auth = await withAdminOrServiceAuth(request);
  if (auth instanceof NextResponse) return withSecurityHeaders(auth, traceId);
  const { db } = auth;

  try {
    const requests = await getAllIntakeRequests(db);
    const response = NextResponse.json(requests);
    response.headers.set('Cache-Control', 'private, max-age=15');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error fetching intake requests', error as Error);
    const response = NextResponse.json({ error: `Failed to fetch intake requests: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

// POST /api/intake — public, guest-submittable. Creates the draft intake row
// from the wizard's Review step; the client then calls the mockup route to
// generate the first mockup.
export async function POST(request: NextRequest) {
  const traceId = withTracing(request);

  const rateLimitResult = await withRateLimit(request, { windowMs: 3600000, maxRequests: 10 }); // 10 intake submissions per hour
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(
      NextResponse.json({ error: 'Too many project requests. Please try again later.' }, {
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString(),
        },
      }),
      traceId
    );
  }

  try {
    const db = await getDb();
    if (!db) {
      return withSecurityHeaders(NextResponse.json({ error: 'Database not available' }, { status: 500 }), traceId);
    }

    const body = await request.json() as {
      client_id?: number;
      email?: string;
      name?: string;
      company_name?: string;
      who_target_users?: string;
      what_description?: string;
      why_description?: string;
      when_timeline?: string;
      where_context?: string;
      how_description?: string;
      backend_interaction_description?: string;
      logo_file_url?: string;
      color_theme?: string;
      support_tier?: string;
    };

    const nameValidation = validateString(body.name, 'name');
    if (!nameValidation.valid) {
      return withSecurityHeaders(NextResponse.json({ error: nameValidation.errors.join(', ') }, { status: 400 }), traceId);
    }
    const emailValidation = validateEmail(body.email || '');
    if (!emailValidation.valid) {
      return withSecurityHeaders(NextResponse.json({ error: emailValidation.errors.join(', ') }, { status: 400 }), traceId);
    }
    const sanitizedEmail = sanitizeEmail(body.email!);
    if (!sanitizedEmail) {
      return withSecurityHeaders(NextResponse.json({ error: 'Invalid email address' }, { status: 400 }), traceId);
    }

    // Rate/min-term are never taken from the client - a request body is
    // fully attacker-controlled, and this previously trusted
    // support_monthly_rate/support_min_term_months directly (same class of
    // bug as the booking price-tampering issue). Only the tier *choice*
    // comes from the client; the price it maps to always comes from this
    // server's own table.
    const tier = resolveSupportTier(body.support_tier);

    const intake = await createIntakeRequest(db, {
      client_id: body.client_id ?? null,
      email: sanitizedEmail,
      name: sanitizeText(body.name!),
      company_name: body.company_name ? sanitizeText(body.company_name) : '',
      who_target_users: body.who_target_users ? sanitizeText(body.who_target_users) : '',
      what_description: body.what_description ? sanitizeText(body.what_description) : '',
      why_description: body.why_description ? sanitizeText(body.why_description) : '',
      when_timeline: body.when_timeline ? sanitizeText(body.when_timeline) : '',
      where_context: body.where_context ? sanitizeText(body.where_context) : '',
      how_description: body.how_description ? sanitizeText(body.how_description) : '',
      backend_interaction_description: body.backend_interaction_description ? sanitizeText(body.backend_interaction_description) : '',
      logo_file_url: body.logo_file_url || '',
      color_theme: body.color_theme || '',
      support_tier: tier.id,
      support_monthly_rate: tier.rate,
      support_min_term_months: tier.minMonths,
    });

    return withSecurityHeaders(NextResponse.json(intake, { status: 201 }), traceId);
  } catch (error) {
    logger.error('Error creating intake request', error as Error);
    const response = NextResponse.json({ error: `Failed to submit project request: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
