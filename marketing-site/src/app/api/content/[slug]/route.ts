import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { withRateLimit, rateLimits } from '@/lib/rateLimit';
import { validateString } from '@/lib/validation';
import { getDb } from '@/lib/db';

export const runtime = "edge";

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);

  // Rate limiting check
  const rateLimitResult = await withRateLimit(request, rateLimits.standard);
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(
      NextResponse.json(
        { error: 'Too many content requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString()
          }
        }
      ),
      traceId
    );
  }

  const db = getDb(request);
  if (!db) {
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
  }

  try {
    const slug = params.slug;
    const slugValidation = validateString(slug, 'slug', 1, 100);
    if (!slugValidation.valid) {
      return NextResponse.json({ error: slugValidation.errors.join(', ') }, { status: 400 });
    }

    const result = await db.prepare('SELECT title, text as content, slug FROM content WHERE slug = ?').bind(slug).first();

    if (!result) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    const response = NextResponse.json({ title: (result as any).title, content: (result as any).content, slug: (result as any).slug });
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=600');
    return response;
  } catch (error) {
    logger.error('Error loading page from D1', error as Error);
    return NextResponse.json({ error: 'Failed to load page' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { slug: string } }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);

  const rateLimitResult = await withRateLimit(request, rateLimits.standard);
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(
      NextResponse.json(
        { error: 'Too many content requests. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString()
          }
        }
      ),
      traceId
    );
  }

  const db = getDb(request);
  if (!db) {
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
  }

  try {
    const slug = params.slug;
    const slugValidation = validateString(slug, 'slug', 1, 100);
    if (!slugValidation.valid) {
      return NextResponse.json({ error: slugValidation.errors.join(', ') }, { status: 400 });
    }

    const body = await request.json() as { title?: string; content?: string };
    const { title, content } = body;

    if (!title && !content) {
      return NextResponse.json({ error: 'Title or content required' }, { status: 400 });
    }

    const existing = await db.prepare('SELECT id FROM content WHERE slug = ?').bind(slug).first();

    if (!existing) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    const updateFields: string[] = [];
    const values: any[] = [];

    if (title) {
      updateFields.push('title = ?');
      values.push(title);
    }
    if (content) {
      updateFields.push('text = ?');
      values.push(content);
    }

    updateFields.push('updated_at = datetime("now")');
    values.push(slug);

    await db.prepare(`UPDATE content SET ${updateFields.join(', ')} WHERE slug = ?`).bind(...values).run();

    return NextResponse.json({ message: "Content updated successfully" });
  } catch (error) {
    logger.error('Error updating content in D1', error as Error);
    return NextResponse.json({ error: 'Failed to update content' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { slug: string } }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);

  const rateLimitResult = await withRateLimit(request, rateLimits.standard);
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(
      NextResponse.json(
        { error: 'Too many content requests. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString()
          }
        }
      ),
      traceId
    );
  }

  const db = getDb(request);
  if (!db) {
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
  }

  try {
    const slug = params.slug;
    const slugValidation = validateString(slug, 'slug', 1, 100);
    if (!slugValidation.valid) {
      return NextResponse.json({ error: slugValidation.errors.join(', ') }, { status: 400 });
    }

    await db.prepare('DELETE FROM content WHERE slug = ?').bind(slug).run();

    return NextResponse.json({ message: "Content deleted successfully" });
  } catch (error) {
    logger.error('Error deleting content from D1', error as Error);
    return NextResponse.json({ error: 'Failed to delete content' }, { status: 500 });
  }
}
