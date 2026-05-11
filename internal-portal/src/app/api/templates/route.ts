import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const body = await request.json() as {
      name?: string;
      type?: string;
      content?: string;
      fields?: Record<string, any>;
    };

    const { name, type, content, fields } = body;

    if (!name || !type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 });
    }

    // Create template in database
    const result = await db.prepare(
      `INSERT INTO templates (name, type, content, fields, created_at, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'), datetime('now')) RETURNING *`
    ).bind(name, type, content || '', JSON.stringify(fields || {})).first();

    if (!result) {
      return NextResponse.json({ error: 'Template creation failed' }, { status: 500 });
    }

    return NextResponse.json(result, { status: 201 });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    let query = 'SELECT * FROM templates';
    let params: any[] = [];

    if (type) {
      query += ' WHERE type = ?';
      params.push(type);
    }

    query += ' ORDER BY created_at DESC';

    const templates = await db.prepare(query).bind(...params).all();

    return NextResponse.json(templates);
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
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
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    // Check if template is used in any contracts
    const contractCheck = await db.prepare(
      `SELECT COUNT(*) as count FROM contracts WHERE template_id = ?`
    ).bind(id).first();

    const contractCount = (contractCheck as any)?.count || 0;

    // Template deletion does not affect existing contracts (as per requirements)
    // We just delete the template, contracts keep their template_id
    await db.prepare('DELETE FROM templates WHERE id = ?').bind(id).run();

    return NextResponse.json({ 
      message: 'Template deleted successfully',
      affectedContracts: contractCount
    });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
