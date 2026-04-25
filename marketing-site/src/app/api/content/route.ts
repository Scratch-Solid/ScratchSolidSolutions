import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { withRateLimit, rateLimits } from '@/lib/rateLimit';
import { validateString } from '@/lib/validation';
import { getDb } from '@/lib/db';

export const runtime = "edge";

function getSlugFromType(type: string): string {
  const slugMap: Record<string, string> = {
    privacy: "privacy-policy",
    terms: "terms-of-service",
    contact: "contact-info",
    services: "services",
    about: "about-us",
    indemnity: "indemnity-form",
  };
  return slugMap[type] || "privacy-policy";
}

export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "privacy";

    const typeValidation = validateString(type, 'type', 1, 50);
    if (!typeValidation.valid) {
      return NextResponse.json({ error: typeValidation.errors.join(', ') }, { status: 400 });
    }

    const slug = getSlugFromType(type);
    const result = await db.prepare('SELECT text as content, title FROM content WHERE slug = ?').bind(slug).first();

    if (result) {
      return NextResponse.json({ content: (result as any).content, type });
    }

    return NextResponse.json({ 
      content: "Content not available. Please contact admin.",
      type 
    }, { status: 404 });
  } catch (error) {
    logger.error('Error loading content from D1', error as Error);
    return NextResponse.json({ error: 'Failed to load content' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "privacy";
    const body = await request.json() as { content?: string; title?: string };
    const { content, title } = body;

    const typeValidation = validateString(type, 'type', 1, 50);
    if (!typeValidation.valid) {
      return NextResponse.json({ error: typeValidation.errors.join(', ') }, { status: 400 });
    }

    const contentValidation = validateString(content, 'content', 1, 10000);
    if (!contentValidation.valid) {
      return NextResponse.json({ error: contentValidation.errors.join(', ') }, { status: 400 });
    }

    const slug = getSlugFromType(type);
    const existing = await db.prepare('SELECT id FROM content WHERE slug = ?').bind(slug).first();

    if (existing) {
      await db.prepare('UPDATE content SET text = ?, title = ?, updated_at = datetime("now") WHERE slug = ?')
        .bind(content, title || type.charAt(0).toUpperCase() + type.slice(1), slug).run();
    } else {
      await db.prepare('INSERT INTO content (collection, slug, title, text) VALUES (?, ?, ?, ?)')
        .bind(type, slug, title || type.charAt(0).toUpperCase() + type.slice(1), content).run();
    }

    return NextResponse.json({ message: "Content updated successfully" });
  } catch (error) {
    logger.error('Error updating content in D1', error as Error);
    return NextResponse.json({ error: 'Failed to update content' }, { status: 500 });
  }
}
