import { NextRequest, NextResponse } from "next/server";
import { directus } from "../../directusClient";
import { logger } from "@/lib/logger";
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { withRateLimit, rateLimits } from '@/lib/rateLimit';
import { validateString } from '@/lib/validation';

export const runtime = "edge";

function getCollectionFromType(type: string): string {
  const collectionMap: Record<string, string> = {
    privacy: "privacy_policy",
    terms: "terms_of_service",
    contact: "contact_info",
    services: "services",
    about: "about_us",
    indemnity: "indemnity_form",
  };
  return collectionMap[type] || "privacy_policy";
}

export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "privacy";

    // Validate type parameter
    const typeValidation = validateString(type, 'type', 1, 50);
    if (!typeValidation.valid) {
      return NextResponse.json({ error: typeValidation.errors.join(', ') }, { status: 400 });
    }

    // Fetch from Directus CMS based on content type
    const collection = getCollectionFromType(type);

    const result = await directus.items(collection).readByQuery({
      limit: 1,
      fields: ["*"]
    });

    if (result.data && result.data.length > 0) {
      const contentData = result.data[0] as any;
      const content = contentData.content || contentData.description || "";
      return NextResponse.json({ content, type });
    }

    // Fallback if no data in Directus
    return NextResponse.json({ 
      content: "Content not available. Please contact admin.",
      type 
    }, { status: 404 });
  } catch (error) {
    logger.error('Error loading content from Directus', error as Error);
    return NextResponse.json({ error: 'Failed to load content' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "privacy";
    const body = await request.json() as { content?: string };
    const { content } = body;

    // Validate inputs
    const typeValidation = validateString(type, 'type', 1, 50);
    if (!typeValidation.valid) {
      return NextResponse.json({ error: typeValidation.errors.join(', ') }, { status: 400 });
    }

    const contentValidation = validateString(content, 'content', 1, 10000);
    if (!contentValidation.valid) {
      return NextResponse.json({ error: contentValidation.errors.join(', ') }, { status: 400 });
    }

    // Map content type to Directus collection
    const collection = getCollectionFromType(type);

    // Check if record exists
    const existing = await directus.items(collection).readByQuery({
      limit: 1,
      fields: ["id"]
    });

    if (existing.data && existing.data.length > 0) {
      // Update existing record
      const recordId = existing.data[0].id;
      await directus.items(collection).updateOne(recordId, { content });
    } else {
      // Create new record
      await directus.items(collection).createOne({ content });
    }

    return NextResponse.json({ message: "Content updated successfully" });
  } catch (error) {
    logger.error('Error updating content in Directus', error as Error);
    return NextResponse.json({ error: 'Failed to update content' }, { status: 500 });
  }
}
