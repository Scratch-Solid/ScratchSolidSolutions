import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { withAuth, withTracing, withSecurityHeaders } from "@/lib/middleware";
import { logger } from "@/lib/logger";
import { withRateLimit, rateLimits } from "@/lib/middleware";
import { getCloudflareContext } from '@opennextjs/cloudflare';

export const dynamic = "force-dynamic";

const PUBLIC_BASE = (process.env.R2_PUBLIC_BASE || 'https://uploads.scratchsolidsolutions.org').replace(/\/$/, '');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function POST(req: NextRequest) {
  const traceId = withTracing(req);
  const authResult = await withAuth(req, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);

  // Get R2 bucket from Cloudflare context
  let bucket: any;
  try {
    const { env } = await getCloudflareContext({ async: true }) as unknown as { env: any };
    bucket = env?.UPLOADS_BUCKET;
    if (!bucket) {
      logger.error('R2 bucket binding not found in Cloudflare context');
      return withSecurityHeaders(NextResponse.json({ error: 'R2 bucket binding not found' }, { status: 500 }), traceId);
    }
  } catch (error) {
    logger.error('Error getting R2 bucket from Cloudflare context', error as Error);
    return withSecurityHeaders(NextResponse.json({ error: 'R2 bucket context error', details: (error as Error).message }, { status: 500 }), traceId);
  }

  // Rate limiting check
  const rateLimitResult = await withRateLimit(req, rateLimits.strict);
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(
      NextResponse.json(
        { error: 'Too many upload requests. Please try again later.' },
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
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'uploads';

    if (!file) {
      return withSecurityHeaders(NextResponse.json({ error: 'file is required' }, { status: 400 }), traceId);
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return withSecurityHeaders(NextResponse.json({ error: 'File type not allowed. Use JPEG, PNG, GIF, WebP, or PDF.' }, { status: 400 }), traceId);
    }
    if (file.size > MAX_FILE_SIZE) {
      return withSecurityHeaders(NextResponse.json({ error: 'File exceeds 8MB limit' }, { status: 400 }), traceId);
    }

    const safeFilename = sanitizeFilename(file.name);
    const key = `${folder.replace(/\/+$/, '')}/${uuidv4()}-${safeFilename}`;

    // Upload file directly to R2 using the bucket binding
    await bucket.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
    });

    const publicUrl = `${PUBLIC_BASE}/${key}`;

    const response = NextResponse.json({
      key,
      publicUrl,
      filename: file.name,
      size: file.size,
      contentType: file.type,
    });
    return withSecurityHeaders(response, traceId);
  } catch (err) {
    logger.error('Upload error', err as Error);
    const response = NextResponse.json({ error: 'Failed to upload file', details: (err as Error).message }, { status: 400 });
    return withSecurityHeaders(response, traceId);
  }
}
