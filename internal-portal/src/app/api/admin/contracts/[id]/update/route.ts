export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withSecurityHeaders, withTracing } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const contractContent = await db.prepare('SELECT * FROM contract_content ORDER BY id DESC LIMIT 1').first();
    const response = NextResponse.json(contractContent || null);
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Error fetching contract content:', error);
    const response = NextResponse.json({ error: 'Failed to fetch contract content' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  try {
    const body = await request.json() as {
      title?: string;
      contract_text?: string;
      terms?: string;
      company_name?: string;
    };

    const { title, contract_text, terms, company_name } = body;

    if (!contract_text || !terms) {
      const response = NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    const result = await db.prepare(
      `INSERT INTO contract_content (title, contract_text, terms, company_name, updated_by, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      title || 'Employment Contract',
      contract_text,
      terms,
      company_name || 'Scratch Solid Solutions',
      (user as any).id
    ).run();

    const response = NextResponse.json({ id: result.meta.last_row_id }, { status: 201 });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Error creating contract content:', error);
    const response = NextResponse.json({ error: 'Failed to create contract content' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function PUT(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  try {
    const body = await request.json() as {
      id?: number;
      title?: string;
      contract_text?: string;
      terms?: string;
      company_name?: string;
    };

    const { id, title, contract_text, terms, company_name } = body;

    if (!id) {
      const response = NextResponse.json({ error: 'ID is required' }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    const result = await db.prepare(
      `UPDATE contract_content
       SET title = COALESCE(?, title),
           contract_text = COALESCE(?, contract_text),
           terms = COALESCE(?, terms),
           company_name = COALESCE(?, company_name),
           updated_by = ?,
           updated_at = datetime('now')
       WHERE id = ?`
    ).bind(title, contract_text, terms, company_name, (user as any).id, id).run();

    if (result.meta.rows_written === 0) {
      const response = NextResponse.json({ error: 'Contract content not found' }, { status: 404 });
      return withSecurityHeaders(response, traceId);
    }

    const response = NextResponse.json({ success: true });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Error updating contract content:', error);
    const response = NextResponse.json({ error: 'Failed to update contract content' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
