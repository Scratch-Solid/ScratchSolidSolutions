import { NextRequest, NextResponse } from 'next/server';
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";
import { validateString, validateNumber } from "@/lib/validation";
import { withRateLimit, rateLimits } from "@/lib/rateLimit";
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const db = getDb(request);
  if (!db) {
    return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const serviceType = searchParams.get('service_type');

    let result;
    if (serviceType) {
      result = await db.prepare('SELECT * FROM pricing WHERE service_type = ?').bind(serviceType).all();
    } else {
      result = await db.prepare('SELECT * FROM pricing ORDER BY created_at DESC').all();
    }

    const response = NextResponse.json(result.results || []);
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=600');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error fetching pricing', error as Error);
    return NextResponse.json({ error: 'Failed to fetch pricing' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  const rateLimitResult = await withRateLimit(request, rateLimits.strict);
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(
      NextResponse.json({ error: 'Too many requests' }, { status: 429 }),
      traceId
    );
  }

  try {
    const body = await request.json() as {
      service_type?: string;
      rate?: number;
      duration?: string;
    };

    const { service_type, rate, duration } = body;

    if (!service_type || !rate) {
      return NextResponse.json({ error: 'Missing required fields: service_type, rate' }, { status: 400 });
    }

    const result = await db.prepare(
      `INSERT INTO pricing (service_type, rate, duration, created_at) VALUES (?, ?, ?, datetime('now')) RETURNING *`
    ).bind(service_type, rate, duration || '').first();

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    logger.error('Error creating pricing', error as Error);
    return NextResponse.json({ error: 'Failed to create pricing' }, { status: 500 });
  }
}
