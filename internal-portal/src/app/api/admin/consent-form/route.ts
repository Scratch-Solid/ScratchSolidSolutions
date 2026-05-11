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
    const consentForm = await db.prepare('SELECT * FROM consent_form_content ORDER BY id DESC LIMIT 1').first();
    return NextResponse.json(consentForm || null);
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Error fetching consent form:', error);
    return NextResponse.json({ error: 'Failed to fetch consent form' }, { status: 500 });
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
      consent_text?: string;
      background_checks?: string;
      acknowledgments?: string;
      witness_name?: string;
    };

    const { title, consent_text, background_checks, acknowledgments, witness_name } = body;

    if (!consent_text || !background_checks || !acknowledgments) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    const result = await db.prepare(
      `INSERT INTO consent_form_content (title, consent_text, background_checks, acknowledgments, witness_name, updated_by, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      title || 'Employee Background Check Consent Form',
      consent_text,
      background_checks,
      acknowledgments,
      witness_name || 'Xolani Jason Tshaka',
      (user as any).id
    ).run();

    return NextResponse.json({ id: result.meta.last_row_id }, { status: 201 });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Error creating consent form:', error);
    return NextResponse.json({ error: 'Failed to create consent form' }, { status: 500 });
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
      consent_text?: string;
      background_checks?: string;
      acknowledgments?: string;
      witness_name?: string;
    };

    const { id, title, consent_text, background_checks, acknowledgments, witness_name } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    const result = await db.prepare(
      `UPDATE consent_form_content
       SET title = COALESCE(?, title),
           consent_text = COALESCE(?, consent_text),
           background_checks = COALESCE(?, background_checks),
           acknowledgments = COALESCE(?, acknowledgments),
           witness_name = COALESCE(?, witness_name),
           updated_by = ?,
           updated_at = datetime('now')
       WHERE id = ?`
    ).bind(title, consent_text, background_checks, acknowledgments, witness_name, (user as any).id, id).run();

    if (result.meta.rows_written === 0) {
      return NextResponse.json({ error: 'Consent form not found' }, { status: 404 });
      return withSecurityHeaders(response, traceId);
    }

    return NextResponse.json({ success: true });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Error updating consent form:', error);
    return NextResponse.json({ error: 'Failed to update consent form' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
