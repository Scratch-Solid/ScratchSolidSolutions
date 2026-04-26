import { NextRequest, NextResponse } from 'next/server';
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";
import { validateString, validateNumber } from "@/lib/validation";
import { withRateLimit, rateLimits } from "@/lib/rateLimit";
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['client']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  // Rate limiting check
  const rateLimitResult = await withRateLimit(request, rateLimits.standard);
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(
      NextResponse.json(
        { error: 'Too many review requests. Please try again later.' },
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
      user_id?: string;
      booking_id?: number;
      rating?: number;
      text?: string;
      images?: string[];
    };

    const { user_id, booking_id, rating = 5, text, images = [] } = body;

    // Validate required fields
    const userIdValidation = validateString(user_id, 'user_id');
    if (!userIdValidation.valid) {
      return NextResponse.json({ error: userIdValidation.errors.join(', ') }, { status: 400 });
    }

    const bookingIdValidation = validateNumber(booking_id, 'booking_id');
    if (!bookingIdValidation.valid) {
      return NextResponse.json({ error: bookingIdValidation.errors.join(', ') }, { status: 400 });
    }

    const textValidation = validateString(text, 'text', 1, 500);
    if (!textValidation.valid) {
      return NextResponse.json({ error: textValidation.errors.join(', ') }, { status: 400 });
    }

    const ratingValidation = validateNumber(rating, 'rating', 1, 5);
    if (!ratingValidation.valid) {
      return NextResponse.json({ error: ratingValidation.errors.join(', ') }, { status: 400 });
    }

    if (!user_id || !booking_id || !text) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate review length (100 words max)
    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount > 100) {
      return NextResponse.json({ error: 'Review must be 100 words or less' }, { status: 400 });
    }

    // Validate images (max 3)
    if (images.length > 3) {
      return NextResponse.json({ error: 'Maximum 3 images allowed' }, { status: 400 });
    }

    // Verify booking belongs to user and is completed
    const booking = await db.prepare(
      `SELECT * FROM bookings WHERE id = ? AND client_id = ? AND status = 'completed'`
    ).bind(booking_id, parseInt(user_id)).first();

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found or not completed' }, { status: 404 });
    }

    // Check if review already exists for this booking
    const existingReview = await db.prepare(
      `SELECT * FROM reviews WHERE booking_id = ?`
    ).bind(booking_id).first();

    if (existingReview) {
      return NextResponse.json({ error: 'Review already exists for this booking' }, { status: 400 });
    }

    // Insert review
    const result = await db.prepare(
      `INSERT INTO reviews (user_id, booking_id, rating, text, images, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'approved', datetime('now')) RETURNING *`
    ).bind(parseInt(user_id), booking_id, rating, text, JSON.stringify(images)).first();

    if (!result) {
      return NextResponse.json({ error: 'Review creation failed' }, { status: 500 });
    }

    const response = NextResponse.json(result, { status: 201 });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error creating review', error as Error);
    const response = NextResponse.json({ error: 'Review creation failed' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const db = await getDb();
  if (!db) {
    return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'approved';
    const limit = parseInt(searchParams.get('limit') || '20');

    const reviews = await db.prepare(
      `SELECT r.*, u.name as user_name, b.location as service_location 
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN bookings b ON r.booking_id = b.id
       WHERE r.status = ?
       ORDER BY r.created_at DESC
       LIMIT ?`
    ).bind(status, limit).all();

    const response = NextResponse.json(reviews);
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error fetching reviews', error as Error);
    const response = NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
