export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { withRateLimit, rateLimits } from "@/lib/middleware";
import { getDb } from '@/lib/db';

export const runtime = "edge";

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

  const db = await getDb();
  if (!db) {
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
  }

  try {
    const result = await db.prepare('SELECT id, slug, title, text, created_at, updated_at FROM content ORDER BY updated_at DESC').all();

    return NextResponse.json({ content: result.results });
  } catch (error) {
    logger.error('Error loading content list from D1', error as Error);
    return NextResponse.json({ error: 'Failed to load content' }, { status: 500 });
  }
}
