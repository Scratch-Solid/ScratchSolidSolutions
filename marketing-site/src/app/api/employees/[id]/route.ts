import { NextRequest, NextResponse } from 'next/server';
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";
import { validateNumber } from "@/lib/validation";
import { withRateLimit, rateLimits } from "@/lib/middleware";
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const employee = await db.prepare('SELECT * FROM employees WHERE id = ?').bind(parseInt(params.id)).first();
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }
    return NextResponse.json(employee);
  } catch (error) {
    logger.error('Error fetching employee', error as Error);
    return NextResponse.json({ error: 'Failed to fetch employee' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  const rateLimitResult = await withRateLimit(request, rateLimits.standard);
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(
      NextResponse.json({ error: 'Too many requests' }, { status: 429 }),
      traceId
    );
  }

  try {
    const body = await request.json() as {
      department?: string;
      position?: string;
      salary?: number;
      status?: string;
    };

    const employee = await db.prepare('SELECT * FROM employees WHERE id = ?').bind(parseInt(params.id)).first();
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const fields = Object.keys(body).filter(k => k !== 'id');
    if (fields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = [...fields.map(f => body[f as keyof typeof body]), parseInt(params.id)];

    const result = await db.prepare(
      `UPDATE employees SET ${setClause}, updated_at = datetime('now') WHERE id = ? RETURNING *`
    ).bind(...values).first();

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error updating employee', error as Error);
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    await db.prepare('DELETE FROM employees WHERE id = ?').bind(parseInt(params.id)).run();
    return NextResponse.json({ message: 'Employee deleted' });
  } catch (error) {
    logger.error('Error deleting employee', error as Error);
    return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 });
  }
}
