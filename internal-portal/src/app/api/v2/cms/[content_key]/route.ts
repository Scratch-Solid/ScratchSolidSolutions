import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders, withCsrf, withRateLimit } from '@/lib/middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ content_key: string }> }
) {
  const traceId = withTracing(request);

  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse) return withSecurityHeaders(rateLimitResponse, traceId);

  try {
    const { content_key: contentKey } = await params;
    const db = await getDb();

    const result = await db.prepare(`
      SELECT content, content_type, updated_at
      FROM marketing_cms
      WHERE content_key = ? AND is_active = 1
    `).bind(contentKey).first<{
      content: string;
      content_type: string;
      updated_at: string;
    }>();

    if (!result) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    return NextResponse.json({
      contentKey,
      content: result.content,
      contentType: result.content_type,
      updatedAt: result.updated_at
    });
  } catch (error) {
    console.error('CMS content error:', error);
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ content_key: string }> }
) {
  const traceId = withTracing(request);

  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse) return withSecurityHeaders(rateLimitResponse, traceId);

  const csrfResult = await withCsrf(request);
  if (csrfResult) return withSecurityHeaders(csrfResult, traceId);

  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);

  try {
    const { content_key: contentKey } = await params;
    const body = await request.json();
    const { content, contentType } = body;

    if (!content) {
      return NextResponse.json({ error: 'Missing content' }, { status: 400 });
    }

    const db = await getDb();

    await db.prepare(`
      INSERT INTO marketing_cms (content_key, content, content_type, is_active, created_at, updated_at, updated_by)
      VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'admin')
      ON CONFLICT(content_key) DO UPDATE SET
        content = excluded.content,
        content_type = excluded.content_type,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = 'admin'
    `).bind(contentKey, content, contentType || 'text').run();

    return NextResponse.json({ success: true, message: 'Content updated successfully' });
  } catch (error) {
    console.error('CMS content update error:', error);
    return NextResponse.json({ error: 'Failed to update content' }, { status: 500 });
  }
}
