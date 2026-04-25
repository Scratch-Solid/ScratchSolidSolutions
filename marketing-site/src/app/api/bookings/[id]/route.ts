import { NextRequest, NextResponse } from 'next/server';
import { getDb, getBookingById, updateBooking } from "@/lib/db";
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';
import { withRateLimit, rateLimits } from '@/lib/rateLimit';
import { validateNumber, validateString } from '@/lib/validation';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  // Rate limiting check
  const rateLimitResult = await withRateLimit(request, rateLimits.standard);
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(
      NextResponse.json(
        { error: 'Too many booking requests. Please try again later.' },
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
    const booking = await getBookingById(db, parseInt(params.id));
    if (!booking) {
      const response = NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      return withSecurityHeaders(response, traceId);
    }
    const response = NextResponse.json(booking);
    response.headers.set('Cache-Control', 'private, max-age=30');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error fetching booking', error as Error);
    const response = NextResponse.json({ error: 'Failed to fetch booking' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  // Rate limiting check
  const rateLimitResult = await withRateLimit(request, rateLimits.standard);
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(
      NextResponse.json(
        { error: 'Too many booking requests. Please try again later.' },
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
      cleaner_id?: number;
      status?: string;
      weekend_assigned?: boolean;
    };

    // Validate inputs
    if (body.cleaner_id !== undefined) {
      const cleanerIdValidation = validateNumber(body.cleaner_id, 'cleaner_id', 1);
      if (!cleanerIdValidation.valid) {
        return NextResponse.json({ error: cleanerIdValidation.errors.join(', ') }, { status: 400 });
      }
    }

    if (body.status !== undefined) {
      const statusValidation = validateString(body.status, 'status', 1, 50);
      if (!statusValidation.valid) {
        return NextResponse.json({ error: statusValidation.errors.join(', ') }, { status: 400 });
      }
    }

    const booking = await updateBooking(db, parseInt(params.id), body);
    
    if (!booking) {
      const response = NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      return withSecurityHeaders(response, traceId);
    }

    // If this is a weekend assignment, update the weekend assignment record
    if (body.weekend_assigned !== undefined && body.cleaner_id) {
      await db.prepare(
        `UPDATE weekend_assignments SET status = 'assigned', assigned_cleaner_id = ?, assigned_cleaner_name = (SELECT name FROM users WHERE id = ?), updated_at = datetime('now') WHERE contract_id IN (SELECT id FROM contracts WHERE business_id = (SELECT client_id FROM bookings WHERE id = ?)) AND status = 'pending'`
      ).bind(body.cleaner_id, body.cleaner_id, parseInt(params.id)).run();
    }

    const response = NextResponse.json(booking);
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error updating booking', error as Error);
    const response = NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
