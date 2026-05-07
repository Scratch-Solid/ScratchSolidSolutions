import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const services = await db.prepare(
      'SELECT * FROM services WHERE is_active = 1 ORDER BY category, name'
    ).all();
    
    const response = NextResponse.json(services.results || []);
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Error fetching services:', error);
    const response = NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const body = await request.json();
    const { name, description, base_price, duration_hours, category } = body;

    if (!name || !base_price) {
      const response = NextResponse.json({ error: 'Name and base price are required' }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    const result = await db.prepare(
      `INSERT INTO services (name, description, base_price, duration_hours, category, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`
    ).bind(name, description || '', base_price, duration_hours || 4, category || 'standard').first();

    const response = NextResponse.json(result, { status: 201 });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Error creating service:', error);
    const response = NextResponse.json({ error: 'Failed to create service' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function PUT(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const body = await request.json();
    const { id, name, description, base_price, duration_hours, category, is_active } = body;

    if (!id) {
      const response = NextResponse.json({ error: 'Service ID is required' }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    const result = await db.prepare(
      `UPDATE services 
       SET name = ?, description = ?, base_price = ?, duration_hours = ?, category = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
       RETURNING *`
    ).bind(name, description || '', base_price, duration_hours || 4, category || 'standard', is_active !== undefined ? (is_active ? 1 : 0) : 1, id).first();

    if (!result) {
      const response = NextResponse.json({ error: 'Service not found' }, { status: 404 });
      return withSecurityHeaders(response, traceId);
    }

    const response = NextResponse.json(result);
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Error updating service:', error);
    const response = NextResponse.json({ error: 'Failed to update service' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function DELETE(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      const response = NextResponse.json({ error: 'Service ID is required' }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    await db.prepare('DELETE FROM services WHERE id = ?').bind(id).run();

    const response = NextResponse.json({ message: 'Service deleted successfully' });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Error deleting service:', error);
    const response = NextResponse.json({ error: 'Failed to delete service' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
