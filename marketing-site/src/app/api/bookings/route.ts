export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb, createBooking, updateBooking, getBookingsByDateRange, getBookingsByCleaner, getBookingsByClient, getUserById } from "@/lib/db";
import { logger } from "@/lib/logger";
import { validateString, validateDate, validateNumber, validateRequired } from "@/lib/validation";
import { withRateLimit, rateLimits, withCsrf, withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { addHours, timeOverlap, generateAlternativeTimes } from '@/lib/bookingUtils';
import { sendBookingConfirmationEmail, sendAdminAlertEmail } from '@/lib/email';
import { createCalcomBooking } from '@/lib/calcom';

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['client', 'business', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;
  const requestingUserId = (user as any).id || (user as any).userId || (user as any).user_id;
  const requestingUserRole = (user as any).role;

  // CSRF protection
  const csrfResult = await withCsrf(request);
  if (csrfResult) return withSecurityHeaders(csrfResult, traceId);

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
      client_id?: number;
      client_name?: string;
      location?: string;
      service_type?: string;
      booking_date?: string;
      booking_time?: string;
      special_instructions?: string;
      booking_type?: string;
      cleaning_type?: string;
      payment_method?: string;
      loyalty_discount?: number;
      cleaner_id?: number;
      promo_code?: string;
      price?: number;
    };
    const {
      client_id,
      client_name,
      location,
      service_type,
      booking_date,
      booking_time,
      special_instructions,
      booking_type = 'standard',
      cleaning_type = 'standard',
      payment_method = 'cash',
      loyalty_discount = 0,
      cleaner_id,
      promo_code,
      price
    } = body;

    const effectiveClientId = requestingUserRole === 'admin'
      ? client_id || requestingUserId
      : requestingUserId;

    if (!effectiveClientId) {
      return NextResponse.json({ error: 'Missing or unauthorized client_id' }, { status: 400 });
    }

    if (requestingUserRole !== 'admin' && client_id && client_id !== effectiveClientId) {
      return NextResponse.json({ error: 'Cannot create bookings for another client' }, { status: 403 });
    }

    const dateValidation = validateDate(booking_date, 'booking_date');
    if (!dateValidation.valid) {
      return NextResponse.json({ error: dateValidation.errors.join(', ') }, { status: 400 });
    }

    const timeValidation = validateString(booking_time, 'booking_time', 1, 50);
    if (!timeValidation.valid) {
      return NextResponse.json({ error: timeValidation.errors.join(', ') }, { status: 400 });
    }

    if (!effectiveClientId || !booking_date || !booking_time) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Business contract advance verification
    const user = await db.prepare('SELECT role FROM users WHERE id = ?').bind(effectiveClientId).first();
    if (user?.role === 'business') {
      let contract: any = null;
      try {
        contract = await db.prepare('SELECT * FROM contracts WHERE business_id = ? AND status = ?').bind(effectiveClientId, 'active').first();
      } catch (contractError) {
        // If contracts table doesn't exist, treat as no active contract
        logger.error('Contracts table query failed', contractError as Error);
      }
      if (!contract) {
        return NextResponse.json({ error: 'Business account requires an active service contract to book services' }, { status: 403 });
      }
      if (contract.is_immutable === 1) {
        const bookingDate = new Date(booking_date);
        const contractStart = new Date((contract as any).start_date as string);
        if (bookingDate < contractStart) {
          return NextResponse.json({ error: 'Booking date is before contract start date' }, { status: 403 });
        }
        const contractEndDate = (contract as any).end_date;
        if (contractEndDate && bookingDate > new Date(contractEndDate as string)) {
          return NextResponse.json({ error: 'Booking date is after contract end date' }, { status: 403 });
        }
      }
    }

    // Cleaner assignment is now done AFTER payment confirmation
    // Do not assign cleaner during booking creation
    const assignedCleanerId = null;

    // Check for booking conflicts (only check against existing bookings with assigned cleaners)
    const conflictingBookings = await getBookingsByDateRange(db, booking_date, booking_date);
    const timeConflicts = conflictingBookings?.filter((b: any) => {
      const requestedStart = booking_time;
      const requestedEnd = addHours(requestedStart, 4);
      const existingStart = b.booking_time;
      const existingEnd = addHours(existingStart, 4);
      return timeOverlap(requestedStart, requestedEnd, existingStart, existingEnd);
    });

    if (timeConflicts && timeConflicts.length > 0) {
      const alternatives = generateAlternativeTimes(booking_date, timeConflicts);
      return NextResponse.json({
        error: 'Booking conflict',
        conflicts: timeConflicts,
        alternatives
      }, { status: 409 });
    }

    // Validate and apply promo code if provided
    let discountAmount = 0;
    if (promo_code) {
      const promo = await db.prepare(
        `SELECT * FROM promo_codes WHERE code = ? AND is_active = 1`
      ).bind(promo_code.toUpperCase()).first();

      if (promo) {
        const now = new Date().toISOString();
        const validFrom = promo.valid_from;
        const validUntil = promo.valid_until;

        if ((!validFrom || validFrom <= now) && (!validUntil || validUntil >= now)) {
          if (!promo.max_uses || (promo.used_count as number) < (promo.max_uses as number)) {
            const priceValue = price || 0;
            const minAmount = (promo.min_amount as number) || 0;

            if (priceValue >= minAmount) {
              if (promo.discount_type === 'percentage') {
                discountAmount = priceValue * ((promo.discount_value as number) / 100);
              } else {
                discountAmount = promo.discount_value as number;
              }
              // Cap discount at price value
              discountAmount = Math.min(discountAmount, priceValue);

              // Increment used_count
              await db.prepare(
                `UPDATE promo_codes SET used_count = used_count + 1 WHERE id = ?`
              ).bind(promo.id).run();
            }
          }
        }
      }
    }

    const booking = await createBooking(db, {
      client_id: effectiveClientId,
      client_name: client_name || 'Unknown',
      location: location || '',
      service_type: service_type || 'standard',
      booking_date,
      booking_time,
      special_instructions,
      booking_type,
      cleaning_type,
      payment_method,
      loyalty_discount,
      cleaner_id: undefined, // No cleaner assigned yet - will be assigned after payment confirmation
      status: 'pending_payment', // New status to indicate waiting for payment
      promo_code: promo_code ? promo_code.toUpperCase() : undefined,
      discount_amount: discountAmount > 0 ? discountAmount : undefined
    });

    // Hand the booking off to Cal.com so the Cal.com -> n8n -> internal-portal
    // pipeline can ingest it as a job (create checklist + auto-assign cleaner).
    // Config-gated: if Cal.com isn't configured this is a no-op and the booking
    // stays local with calcom_status = 'not_sent'.
    const bookingId = (booking as any)?.id as number | undefined;
    try {
      const bookingUser = await getUserById(db, effectiveClientId);
      const calResult = await createCalcomBooking({
        name: client_name || (bookingUser as any)?.name || 'Customer',
        email: (bookingUser as any)?.email || '',
        phone: (bookingUser as any)?.phone || undefined,
        serviceType: service_type || 'standard',
        bookingDate: booking_date,
        bookingTime: booking_time,
        location: location || undefined,
        specialInstructions: special_instructions || undefined,
        marketingBookingId: bookingId,
      });

      if (bookingId) {
        if (calResult.success && calResult.uid) {
          await updateBooking(db, bookingId, { calcom_uid: calResult.uid, calcom_status: 'created' });
        } else if (calResult.skipped) {
          await updateBooking(db, bookingId, { calcom_status: 'not_sent' });
        } else {
          await updateBooking(db, bookingId, { calcom_status: 'failed' });
          logger.error('Cal.com hand-off failed for booking', new Error(calResult.error || 'unknown'));
        }
      }
    } catch (calError) {
      logger.error('Cal.com hand-off threw for booking', calError as Error);
      if (bookingId) {
        try { await updateBooking(db, bookingId, { calcom_status: 'failed' }); } catch { /* best-effort */ }
      }
    }

    // Send booking confirmation email to client
    try {
      const user = await getUserById(db, effectiveClientId);
      if (user && (user as any).email) {
        await sendBookingConfirmationEmail(
          (user as any).email,
          client_name || 'Customer',
          booking_date,
          booking_time,
          location || '',
          service_type || 'standard'
        );
      }
    } catch (emailError) {
      logger.error('Failed to send booking confirmation email', emailError as Error);
    }

    // Send admin alert email
    try {
      const user = await getUserById(db, effectiveClientId);
      await sendAdminAlertEmail(
        client_name || 'Customer',
        booking_date,
        booking_time,
        location || '',
        service_type || 'standard',
        (user as any).email || ''
      );
    } catch (emailError) {
      logger.error('Failed to send admin alert email', emailError as Error);
    }

    const response = NextResponse.json(booking, { status: 201 });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error creating booking', error as Error);
    const response = NextResponse.json({ error: `Failed to create booking: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');
    const cleanerId = searchParams.get('cleaner_id');
    const date = searchParams.get('date');

    const requestingUserRole = (user as any).role;
    const requestingUserId = (user as any).id || (user as any).userId || (user as any).user_id;
    let bookings;

    if (cleanerId) {
      const cleanerIdNumber = parseInt(cleanerId);
      if (requestingUserRole !== 'admin' && requestingUserRole !== 'cleaner') {
        return withSecurityHeaders(NextResponse.json({ error: 'Forbidden' }, { status: 403 }), traceId);
      }
      if (requestingUserRole === 'cleaner' && cleanerIdNumber !== requestingUserId) {
        return withSecurityHeaders(NextResponse.json({ error: 'Forbidden' }, { status: 403 }), traceId);
      }
      bookings = await getBookingsByCleaner(db, cleanerIdNumber);
    } else if (clientId) {
      const clientIdNumber = parseInt(clientId);
      if (requestingUserRole !== 'admin' && clientIdNumber !== requestingUserId) {
        return withSecurityHeaders(NextResponse.json({ error: 'Forbidden' }, { status: 403 }), traceId);
      }
      bookings = await getBookingsByClient(db, clientIdNumber);
    } else if (requestingUserRole !== 'admin') {
      bookings = await getBookingsByClient(db, requestingUserId);
    } else {
      bookings = await getBookingsByDateRange(db, date || new Date().toISOString().split('T')[0], date || new Date().toISOString().split('T')[0]);
    }

    const response = NextResponse.json(bookings || []);
    response.headers.set('Cache-Control', 'private, max-age=30');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error fetching bookings', error as Error);
    const response = NextResponse.json({ error: `Failed to fetch bookings: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
