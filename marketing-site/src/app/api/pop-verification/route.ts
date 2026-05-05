import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';
import { validateString, validateNumber } from '@/lib/validation';
import { withRateLimit, rateLimits } from "@/lib/middleware";
import { verifyPOP } from '@/lib/zoho';

export const dynamic = "force-dynamic";

// POST - Upload POP for a booking
export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['client', 'business']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  const rateLimitResult = await withRateLimit(request, rateLimits.standard);
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(
      NextResponse.json(
        { error: 'Too many POP upload requests. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString()
          }
        }
      ),
      traceId
    );
  }

  try {
    const body = await request.json() as {
      booking_id?: number;
      pop_reference?: string;
      pop_upload_url?: string;
    };
    const { booking_id, pop_reference, pop_upload_url } = body;

    const bookingIdValidation = validateNumber(booking_id, 'booking_id');
    if (!bookingIdValidation.valid) {
      return NextResponse.json({ error: bookingIdValidation.errors.join(', ') }, { status: 400 });
    }

    const popReferenceValidation = validateString(pop_reference, 'pop_reference', 1, 100);
    if (!popReferenceValidation.valid) {
      return NextResponse.json({ error: popReferenceValidation.errors.join(', ') }, { status: 400 });
    }

    if (!booking_id || !pop_reference) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if booking belongs to user
    const booking = await db.prepare(
      'SELECT id, client_id, status FROM bookings WHERE id = ?'
    ).bind(booking_id).first();

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if ((booking as any).client_id !== (authResult as any).user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update booking with POP information
    await db.prepare(
      `UPDATE bookings 
       SET pop_status = 'pending', pop_reference = ?, pop_upload_url = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(pop_reference, pop_upload_url || '', booking_id).run();

    // Update booking status to pending_pop
    await db.prepare(
      `UPDATE bookings SET status = 'pending_pop', updated_at = datetime('now') WHERE id = ?`
    ).bind(booking_id).run();

    const response = NextResponse.json({ 
      message: 'POP uploaded successfully. Awaiting admin verification.',
      pop_status: 'pending'
    }, { status: 200 });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error uploading POP', error as Error);
    const response = NextResponse.json({ error: 'POP upload failed' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

// PUT - Admin verifies/rejects POP
export async function PUT(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  const rateLimitResult = await withRateLimit(request, rateLimits.strict);
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(
      NextResponse.json(
        { error: 'Too many verification requests. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString()
          }
        }
      ),
      traceId
    );
  }

  try {
    const body = await request.json() as {
      booking_id?: number;
      action?: 'verify' | 'reject';
      notes?: string;
    };
    const { booking_id, action, notes } = body;

    const bookingIdValidation = validateNumber(booking_id, 'booking_id');
    if (!bookingIdValidation.valid) {
      return NextResponse.json({ error: bookingIdValidation.errors.join(', ') }, { status: 400 });
    }

    if (!booking_id || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const booking = await db.prepare(
      'SELECT id, pop_reference, pop_status, zoho_invoice_id FROM bookings WHERE id = ?'
    ).bind(booking_id).first();

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if ((booking as any).pop_status !== 'pending') {
      return NextResponse.json({ error: 'POP is not pending verification' }, { status: 400 });
    }

    if (action === 'verify') {
      // Verify POP with Zoho if invoice exists
      let zohoVerified = true;
      if ((booking as any).zoho_invoice_id && (booking as any).pop_reference) {
        const zohoResult = await verifyPOP((booking as any).zoho_invoice_id, (booking as any).pop_reference);
        zohoVerified = zohoResult.verified;
      }

      if (zohoVerified) {
        await db.prepare(
          `UPDATE bookings 
           SET pop_status = 'verified', pop_verified_at = datetime('now'), pop_verified_by = ?, status = 'pop_verified', updated_at = datetime('now')
           WHERE id = ?`
        ).bind((authResult as any).user.id, booking_id).run();

        // Log audit
        await db.prepare(
          `INSERT INTO audit_logs (admin_id, action, resource_type, resource_id, details)
           VALUES (?, 'verify_pop', 'booking', ?, ?)`
        ).bind((authResult as any).user.id, booking_id, JSON.stringify({ notes })).run();

        const response = NextResponse.json({ 
          message: 'POP verified successfully. Cleaner can now be dispatched.',
          pop_status: 'verified'
        }, { status: 200 });
        return withSecurityHeaders(response, traceId);
      } else {
        const response = NextResponse.json({ 
          error: 'POP verification failed in Zoho. Payment not found.',
          pop_status: 'pending'
        }, { status: 400 });
        return withSecurityHeaders(response, traceId);
      }
    } else if (action === 'reject') {
      await db.prepare(
        `UPDATE bookings 
         SET pop_status = 'rejected', status = 'cancelled', updated_at = datetime('now')
         WHERE id = ?`
      ).bind(booking_id).run();

      // Log audit
      await db.prepare(
        `INSERT INTO audit_logs (admin_id, action, resource_type, resource_id, details)
         VALUES (?, 'reject_pop', 'booking', ?, ?)`
      ).bind((authResult as any).user.id, booking_id, JSON.stringify({ notes })).run();

      const response = NextResponse.json({ 
        message: 'POP rejected. Booking cancelled.',
        pop_status: 'rejected'
      }, { status: 200 });
      return withSecurityHeaders(response, traceId);
    }

    const response = NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error verifying POP', error as Error);
    const response = NextResponse.json({ error: 'POP verification failed' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

// GET - Get pending POP verifications (admin only)
export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    let result;
    if (status === 'pending') {
      result = await db.prepare(
        `SELECT b.*, u.name as client_name, u.email as client_email 
         FROM bookings b 
         JOIN users u ON b.client_id = u.id 
         WHERE b.pop_status = 'pending'
         ORDER BY b.created_at DESC`
      ).all();
    } else {
      result = await db.prepare(
        `SELECT b.*, u.name as client_name, u.email as client_email 
         FROM bookings b 
         JOIN users u ON b.client_id = u.id 
         WHERE b.pop_status IN ('verified', 'rejected')
         ORDER BY b.pop_verified_at DESC LIMIT 50`
      ).all();
    }

    const response = NextResponse.json(result.results || []);
    response.headers.set('Cache-Control', 'private, max-age=10');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error fetching POP verifications', error as Error);
    const response = NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
