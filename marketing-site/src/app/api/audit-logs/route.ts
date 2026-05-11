export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get('admin_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let result;
    if (adminId) {
      result = await db.prepare(
        `SELECT * FROM audit_logs WHERE admin_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
      ).bind(parseInt(adminId), limit, offset).all();
    } else {
      result = await db.prepare(
        `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ? OFFSET ?`
      ).bind(limit, offset).all();
    }

    return NextResponse.json(result.results || []);
  } catch (error) {
    logger.error('Error fetching audit logs', error as Error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const body = await request.json() as {
      admin_id?: number;
      action?: string;
      resource_type?: string;
      resource_id?: number;
      details?: string;
      ip_address?: string;
    };

    const { admin_id, action, resource_type, resource_id, details, ip_address } = body;

    if (!admin_id || !action || !resource_type) {
      return NextResponse.json({ error: 'Missing required fields: admin_id, action, resource_type' }, { status: 400 });
    }

    const result = await db.prepare(
      `INSERT INTO audit_logs (admin_id, action, resource_type, resource_id, details, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now')) RETURNING *`
    ).bind(admin_id, action, resource_type, resource_id || null, details || '{}', ip_address || '').first();

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    logger.error('Error creating audit log', error as Error);
    return NextResponse.json({ error: 'Failed to create audit log' }, { status: 500 });
  }
}
