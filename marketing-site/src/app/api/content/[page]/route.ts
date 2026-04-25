import { NextRequest, NextResponse } from 'next/server';
import { directus } from "../../../directusClient";
import { logger } from "@/lib/logger";
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { withRateLimit, rateLimits } from '@/lib/rateLimit';
import { validateString } from '@/lib/validation';

const DIRECTUS_URL = process.env.DIRECTUS_URL || '';
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN || '';

export const runtime = "edge";

export async function GET(request: NextRequest, { params }: { params: { page: string } }) {
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

  try {
    const { page } = params;
    
    // Validate page parameter
    const pageValidation = validateString(page, 'page', 1, 100);
    if (!pageValidation.valid) {
      return NextResponse.json({ error: pageValidation.errors.join(', ') }, { status: 400 });
    }
    const pageSlug = params.page;
    const url = new URL(`${DIRECTUS_URL}/items/pages`);
    url.searchParams.append('filter[slug][_eq]', pageSlug);
    url.searchParams.append('limit', '1');

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (DIRECTUS_TOKEN) headers['Authorization'] = `Bearer ${DIRECTUS_TOKEN}`;

    const directusResponse = await fetch(url.toString(), { headers });
    if (!directusResponse.ok) throw new Error(`Directus error: ${directusResponse.statusText}`);

    const json = await directusResponse.json() as any;
    const data = json.data?.data || json.data || [];
    if (data.length === 0) return NextResponse.json({ error: 'Page not found' }, { status: 404 });

    const response = NextResponse.json(data[0]);
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=600');
    return response;
  } catch (error) {
    logger.error('Error fetching content', error as Error);
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
  }
}
