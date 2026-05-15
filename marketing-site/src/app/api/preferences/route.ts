import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['client', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  try {
    const userId = (user as any).id;

    const preferences = await db.prepare(
      'SELECT * FROM client_preferences_extended WHERE user_id = ?'
    ).bind(userId).first();

    const response = NextResponse.json(preferences || { user_id: userId });
    response.headers.set('Cache-Control', 'private, max-age=60');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error fetching client preferences', error as Error);
    const response = NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function PUT(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['client']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  try {
    const body = await request.json() as {
      preferred_cleaner_id?: number;
      preferred_time_slot?: 'morning' | 'afternoon' | 'evening';
      notification_preferences?: string;
      language_preference?: string;
      access_notes?: string;
    };
    const userId = (user as any).id;

    // Check if preferences exist
    const existing = await db.prepare(
      'SELECT id FROM client_preferences_extended WHERE user_id = ?'
    ).bind(userId).first();

    if (existing) {
      // Update existing preferences
      const updates = [];
      const values = [];

      if (body.preferred_cleaner_id !== undefined) {
        updates.push('preferred_cleaner_id = ?');
        values.push(body.preferred_cleaner_id);
      }
      if (body.preferred_time_slot !== undefined) {
        updates.push('preferred_time_slot = ?');
        values.push(body.preferred_time_slot);
      }
      if (body.notification_preferences !== undefined) {
        updates.push('notification_preferences = ?');
        values.push(body.notification_preferences);
      }
      if (body.language_preference !== undefined) {
        updates.push('language_preference = ?');
        values.push(body.language_preference);
      }
      if (body.access_notes !== undefined) {
        updates.push('access_notes = ?');
        values.push(body.access_notes);
      }

      updates.push('updated_at = datetime(\'now\')');
      values.push(userId);

      await db.prepare(
        `UPDATE client_preferences_extended SET ${updates.join(', ')} WHERE user_id = ?`
      ).bind(...values).run();
    } else {
      // Create new preferences
      await db.prepare(
        `INSERT INTO client_preferences_extended (user_id, preferred_cleaner_id, preferred_time_slot, notification_preferences, language_preference, access_notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      ).bind(
        userId,
        body.preferred_cleaner_id || null,
        body.preferred_time_slot || null,
        body.notification_preferences || '{}',
        body.language_preference || 'en',
        body.access_notes || ''
      ).run();
    }

    logger.info(`Client preferences updated for user ${userId}`);

    const response = NextResponse.json({ success: true });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error updating client preferences', error as Error);
    const response = NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
