export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withTracing, withSecurityHeaders, withRateLimit } from '@/lib/middleware';
import { validateEmail, validatePhone, sanitizeInput } from '@/lib/validation';
import { log } from '@/lib/logger';

const ALLOWED_ROLES = ['digital', 'transport'] as const;

// POST /api/apply — public application for Digital or Transportation roles.
// This replaces the old /api/auth/register self-serve signup, which created a
// live, fully-active account with zero admin oversight from client-supplied
// role/paysheet-code input. Submitting here only creates a pending row in
// new_joiners for an admin to review; the account itself is only created on
// approval (see /api/admin/new-joiners/[id]/approve), via
// activateStaffAccount() in lib/cleaner-integrations.ts. Cleaner applications
// keep using the existing, more compliance-heavy /api/signup/cleaner flow
// (POPIA/background-check consent, bank details) — not this route.
export async function POST(request: NextRequest) {
  const traceId = withTracing(request);

  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse) return withSecurityHeaders(rateLimitResponse, traceId);

  try {
    const db = await getDb();
    if (!db) {
      return withSecurityHeaders(NextResponse.json({ error: 'Database unavailable' }, { status: 503 }), traceId);
    }

    const body = await request.json() as {
      role?: string;
      name?: string;
      email?: string;
      phone?: string;
      message?: string;
    };
    const { role, name, email, phone, message } = body;

    if (!role || !ALLOWED_ROLES.includes(role as any)) {
      return withSecurityHeaders(NextResponse.json({ error: `role must be one of: ${ALLOWED_ROLES.join(', ')}` }, { status: 400 }), traceId);
    }
    if (!name || !email || !phone) {
      return withSecurityHeaders(NextResponse.json({ error: 'name, email, and phone are required' }, { status: 400 }), traceId);
    }
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return withSecurityHeaders(NextResponse.json({ error: emailValidation.errors.join(', ') }, { status: 400 }), traceId);
    }
    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.valid) {
      return withSecurityHeaders(NextResponse.json({ error: phoneValidation.errors.join(', ') }, { status: 400 }), traceId);
    }

    // new_joiners was originally cleaner-only (id_number/address/emergency_contact/
    // bank_details are all NOT NULL there); a digital/transport application has
    // none of that, so those columns get an empty-string placeholder rather than
    // reshaping the table. `role`/`position_applied_for` are added defensively
    // since they weren't part of the original schema.
    await db.prepare(`ALTER TABLE new_joiners ADD COLUMN role TEXT DEFAULT 'cleaner'`).run().catch(() => {});
    await db.prepare(`ALTER TABLE new_joiners ADD COLUMN position_applied_for TEXT`).run().catch(() => {});
    await db.prepare(`ALTER TABLE new_joiners ADD COLUMN message TEXT`).run().catch(() => {});

    const existingEmail = await db.prepare(
      'SELECT id FROM new_joiners WHERE email = ? AND status = ?'
    ).bind(email, 'pending').first();
    if (existingEmail) {
      return withSecurityHeaders(NextResponse.json({ error: 'An application with this email is already pending review' }, { status: 409 }), traceId);
    }

    const sanitizedName = sanitizeInput(name);
    const sanitizedMessage = message ? sanitizeInput(message) : '';
    const positionLabel = role === 'digital' ? 'Digital Developer' : 'Transportation Driver';

    await db.prepare(
      `INSERT INTO new_joiners (
        name, id_number, email, phone, whatsapp, address, emergency_contact, bank_details,
        status, role, position_applied_for, message, created_at, updated_at
      ) VALUES (?, '', ?, ?, ?, '', '', '', 'pending', ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(sanitizedName, email, phone, phone, role, positionLabel, sanitizedMessage).run();

    log.audit('SUBMIT', 'staff_application', { traceId, email, role, name: sanitizedName });

    const response = NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        status: 'pending',
        next_steps: [
          'Your application has been submitted for review',
          'You will be notified by email once your application is approved',
          'Upon approval, you will receive your paysheet code and a temporary password to log in',
        ],
      },
    }, { status: 201 });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    log.error('Staff application failed', error instanceof Error ? error : new Error(String(error)), { traceId });
    const response = NextResponse.json({ error: `Failed to submit application: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
