import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';
import { validateString, validateNumber } from '@/lib/validation';
import { withRateLimit, rateLimits } from "@/lib/middleware";
import {
  sendNotification,
  sendQuoteNotification,
  sendBookingConfirmation,
  sendCleanerStatusUpdate,
  formatPhoneNumber,
  type NotificationConfig
} from '@/lib/notification-service';

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  // Rate limiting check
  const rateLimitResult = await withRateLimit(request, rateLimits.standard);
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(
      NextResponse.json(
        { error: 'Too many notification requests. Please try again later.' },
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
      type?: string;
      message?: string;
      target_user_id?: number;
      send_via?: 'whatsapp' | 'sms' | 'email';
      quote_ref?: string;
      service_name?: string;
      price?: number;
      booking_date?: string;
      booking_time?: string;
      cleaner_name?: string;
      eta?: string;
      status?: 'on_way' | 'arrived' | 'completed';
    };
    const { 
      booking_id, 
      type, 
      message, 
      target_user_id,
      send_via = 'whatsapp',
      quote_ref,
      service_name,
      price,
      booking_date,
      booking_time,
      cleaner_name,
      eta,
      status
    } = body;
    const sessionRole: string = (user as any).role;
    const user_id: number = sessionRole === 'admin' && target_user_id ? target_user_id : (user as any).id;

    if (!booking_id || !type || !message) {
      const response = NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // Get user's phone number
    const userData = await db.prepare(
      'SELECT phone, email FROM users WHERE id = ?'
    ).bind(user_id).first();

    if (!userData) {
      const response = NextResponse.json({ error: 'User not found' }, { status: 404 });
      return withSecurityHeaders(response, traceId);
    }

    // Check user's notification preferences
    const userPrefs = await db.prepare(
      'SELECT whatsapp_opt_in, sms_opt_in, email_opt_in FROM client_preferences WHERE client_id = ?'
    ).bind(user_id).first();

    const config: NotificationConfig = {
      twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
      twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
      twilioWhatsAppNumber: process.env.TWILIO_WHATSAPP_NUMBER,
      twilioSmsNumber: process.env.TWILIO_SMS_NUMBER,
      resendApiKey: process.env.RESEND_API_KEY
    };

    // Send notification based on type
    let notificationResult;
    const formattedPhone = userData.phone ? formatPhoneNumber(userData.phone as string) : '';

    if (type === 'quote' && quote_ref && service_name && price && formattedPhone) {
      notificationResult = await sendQuoteNotification(formattedPhone, quote_ref, service_name, price, config);
    } else if (type === 'booking_confirmation' && booking_date && booking_time && formattedPhone) {
      notificationResult = await sendBookingConfirmation(formattedPhone, booking_id.toString(), service_name || 'Cleaning Service', booking_date, booking_time, config);
    } else if (type === 'cleaner_status' && status && cleaner_name && formattedPhone) {
      notificationResult = await sendCleanerStatusUpdate(formattedPhone, booking_id.toString(), status, cleaner_name, config, eta);
    } else if (formattedPhone && (userPrefs?.whatsapp_opt_in || userPrefs?.sms_opt_in)) {
      notificationResult = await sendNotification({
        to: formattedPhone,
        method: userPrefs.whatsapp_opt_in ? 'whatsapp' : 'sms',
        message
      }, config);
    }

    // Store notification in database
    const result = await db.prepare(
      `INSERT INTO notifications (user_id, booking_id, type, message, status, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now')) RETURNING *`
    ).bind(
      user_id, 
      booking_id, 
      type, 
      message, 
      notificationResult?.success ? 'sent' : 'failed'
    ).first();

    const response = NextResponse.json({
      ...result,
      notification_result: notificationResult
    }, { status: 201 });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error creating notification', error as Error);
    const response = NextResponse.json({ error: 'Notification creation failed' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  // Rate limiting check
  const rateLimitResult = await withRateLimit(request, rateLimits.standard);
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(
      NextResponse.json(
        { error: 'Too many notification requests. Please try again later.' },
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
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    let result;
    if (type) {
      result = await db.prepare(
        'SELECT * FROM notifications WHERE user_id = ? AND type = ? ORDER BY created_at DESC'
      ).bind((user as any).id, type).all();
    } else {
      result = await db.prepare(
        'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC'
      ).bind((user as any).id).all();
    }

    const response = NextResponse.json(result.results || []);
    response.headers.set('Cache-Control', 'private, max-age=10');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error fetching notifications', error as Error);
    const response = NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
