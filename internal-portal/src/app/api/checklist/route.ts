import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['cleaner', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const body = await request.json() as {
      booking_id?: number;
      service_type?: string;
      items?: Array<{
        item_name: string;
        item_category: string;
      }>;
    };
    const { booking_id, service_type, items } = body;
    const cleanerId = (authResult as any).user.id;

    if (!booking_id || !service_type) {
      const response = NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // Create checklist
    const checklist = await db.prepare(
      `INSERT INTO cleaning_checklists (booking_id, cleaner_id, service_type, created_at)
       VALUES (?, ?, ?, datetime('now')) RETURNING *`
    ).bind(booking_id, cleanerId, service_type).first();

    // Add items if provided
    if (items && items.length > 0) {
      for (const item of items) {
        await db.prepare(
          `INSERT INTO checklist_items (checklist_id, item_name, item_category, completed)
           VALUES (?, ?, ?, 0)`
        ).bind((checklist as any).id, item.item_name, item.item_category).run();
      }
    }

    logger.info(`Cleaning checklist created for booking ${booking_id}`);

    const response = NextResponse.json(checklist, { status: 201 });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error creating checklist', error as Error);
    const response = NextResponse.json({ error: 'Failed to create checklist' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['cleaner', 'admin', 'client']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('booking_id');
    const checklistId = searchParams.get('checklist_id');

    let query = 'SELECT * FROM cleaning_checklists WHERE 1=1';
    const params: any[] = [];

    if (bookingId) {
      query += ' AND booking_id = ?';
      params.push(bookingId);
    }
    if (checklistId) {
      query += ' AND id = ?';
      params.push(checklistId);
    }

    const checklists = await db.prepare(query).bind(...params).all();

    // Get items for each checklist
    const results = await Promise.all(
      (checklists.results || []).map(async (checklist: any) => {
        const items = await db.prepare(
          'SELECT * FROM checklist_items WHERE checklist_id = ? ORDER BY item_category, id'
        ).bind(checklist.id).all();
        return {
          ...checklist,
          items: items.results || []
        };
      })
    );

    const response = NextResponse.json(results);
    response.headers.set('Cache-Control', 'private, max-age=30');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error fetching checklists', error as Error);
    const response = NextResponse.json({ error: 'Failed to fetch checklists' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
