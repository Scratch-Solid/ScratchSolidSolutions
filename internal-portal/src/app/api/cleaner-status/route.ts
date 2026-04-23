import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '../../../lib/middleware';

const VALID_STATUSES = ['idle', 'on_way', 'arrived', 'completed'];

export async function PUT(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['cleaner', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const body = await request.json();
    const { cleaner_id, status, gps_lat, gps_long } = body;

    if (!cleaner_id || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Check if cleaner is blocked
    const cleaner = await db.prepare('SELECT blocked FROM cleaner_profiles WHERE user_id = ?').bind(cleaner_id).first();
    if (!cleaner) {
      return NextResponse.json({ error: 'Cleaner not found' }, { status: 404 });
    }
    if (cleaner.blocked === 1) {
      return NextResponse.json({ error: 'Cleaner account is blocked' }, { status: 403 });
    }

    // Validate status transitions
    const currentStatus = await db.prepare('SELECT status FROM cleaner_profiles WHERE user_id = ?').bind(cleaner_id).first() as any;
    const validTransition = validateStatusTransition(currentStatus?.status || 'idle', status);
    if (!validTransition) {
      return NextResponse.json({ error: 'Invalid status transition' }, { status: 400 });
    }

    // Update cleaner status and GPS coordinates
    const updates = ['status = ?', 'updated_at = datetime(\'now\')'];
    const values = [status];
    if (gps_lat !== undefined) {
      updates.push('gps_lat = ?');
      values.push(gps_lat);
    }
    if (gps_long !== undefined) {
      updates.push('gps_long = ?');
      values.push(gps_long);
    }
    values.push(cleaner_id);

    await db.prepare(
      `UPDATE cleaner_profiles SET ${updates.join(', ')} WHERE user_id = ?`
    ).bind(...values).run();

    const response = NextResponse.json({ success: true, status });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Error updating cleaner status:', error);
    const response = NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['cleaner', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const cleanerId = searchParams.get('cleaner_id');

    if (!cleanerId) {
      return NextResponse.json({ error: 'Missing cleaner_id' }, { status: 400 });
    }

    const cleaner = await db.prepare('SELECT status, gps_lat, gps_long, blocked FROM cleaner_profiles WHERE user_id = ?').bind(cleanerId).first();
    
    if (!cleaner) {
      return NextResponse.json({ error: 'Cleaner not found' }, { status: 404 });
    }

    const response = NextResponse.json(cleaner);
    response.headers.set('Cache-Control', 'private, max-age=10');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Error fetching cleaner status:', error);
    const response = NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

function validateStatusTransition(current: string, next: string): boolean {
  const transitions: Record<string, string[]> = {
    'idle': ['on_way'],
    'on_way': ['arrived', 'idle'],
    'arrived': ['completed', 'on_way'],
    'completed': ['idle']
  };
  
  return transitions[current]?.includes(next) || false;
}
