import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';
import { formatPhoneNumber } from '@/lib/notification-service';

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  try {
    const prefs = await db.prepare(
      'SELECT * FROM client_preferences WHERE client_id = ?'
    ).bind((user as any).id).first();

    const response = NextResponse.json(prefs || {
      whatsapp_opt_in: false,
      sms_opt_in: false,
      email_opt_in: false
    });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error fetching notification preferences', error as Error);
    const response = NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  try {
    const body = await request.json() as {
      whatsapp_opt_in?: boolean;
      sms_opt_in?: boolean;
      email_opt_in?: boolean;
      phone?: string;
    };
    const { whatsapp_opt_in, sms_opt_in, email_opt_in, phone } = body;

    // Update user's phone number if provided
    if (phone) {
      const formattedPhone = formatPhoneNumber(phone);
      await db.prepare(
        'UPDATE users SET phone = ? WHERE id = ?'
      ).bind(formattedPhone, (user as any).id).run();
    }

    // Update or insert notification preferences
    const existingPrefs = await db.prepare(
      'SELECT * FROM client_preferences WHERE client_id = ?'
    ).bind((user as any).id).first();

    let result;
    if (existingPrefs) {
      result = await db.prepare(
        `UPDATE client_preferences 
         SET whatsapp_opt_in = COALESCE(?, whatsapp_opt_in),
             sms_opt_in = COALESCE(?, sms_opt_in),
             email_opt_in = COALESCE(?, email_opt_in),
             updated_at = datetime('now')
         WHERE client_id = ? RETURNING *`
      ).bind(whatsapp_opt_in, sms_opt_in, email_opt_in, (user as any).id).first();
    } else {
      result = await db.prepare(
        `INSERT INTO client_preferences (client_id, whatsapp_opt_in, sms_opt_in, email_opt_in, created_at, updated_at)
         VALUES (?, COALESCE(?, 0), COALESCE(?, 0), COALESCE(?, 0), datetime('now'), datetime('now')) RETURNING *`
      ).bind((user as any).id, whatsapp_opt_in, sms_opt_in, email_opt_in).first();
    }

    const response = NextResponse.json(result, { status: 200 });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error updating notification preferences', error as Error);
    const response = NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
